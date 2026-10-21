// src/app/api/auth/mfa/route.ts
// Activar, consultar y desactivar la verificación en dos pasos del usuario que tiene la sesión abierta.
// Acciones: "status" | "enable" (genera el QR) | "verify" (confirma y activa) | "disable"
import { NextResponse } from "next/server";
import { ipDelPedido, registrarAuditoria } from "@/lib/auditoria/registrar";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import {
  generarSecretoMfa,
  generarQrMfa,
  crearCodigosRecuperacion,
  esCodigoTotp,
  verificarCodigoTotp,
  usarCodigoRecuperacion,
} from "@/lib/auth/mfa";
import { descifrar } from "@/lib/auth/cifrado";

function error(mensaje: string, status = 400) {
  return NextResponse.json({ success: false, error: mensaje }, { status });
}

export async function POST(request: Request) {
  // 1. Solo el usuario logueado puede tocar SU propio MFA
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return error("No autenticado", 401);
  }

  let action = "";
  let code = "";
  try {
    const body = await request.json();
    action = typeof body?.action === "string" ? body.action : "";
    code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  } catch {
    return error("Solicitud inválida.");
  }

  try {
    const dataSource = await initializeDatabase();
    const repo = dataSource.getRepository(UsuarioEntity);
    const usuario = await repo
      .createQueryBuilder("usuario")
      .addSelect(["usuario.mfaSecreto", "usuario.mfaCodigosRecuperacion"])
      .where("usuario.id = :id", { id: session.user.id })
      .getOne();

    if (!usuario) {
      return error("Usuario no encontrado.", 404);
    }

    // ¿Tiene el MFA activado?
    if (action === "status") {
      return NextResponse.json({ success: true, mfaEnabled: Boolean(usuario.mfaHabilitado) });
    }

    // Paso 1 de la activación: generar secreto + QR (todavía NO queda activado)
    if (action === "enable") {
      if (usuario.mfaHabilitado) {
        return error("La verificación en dos pasos ya está activada.");
      }
      // Si ya había un QR pendiente (sin confirmar), reutilizamos el mismo secreto:
      // así, si la persona cierra y vuelve a abrir la ventana, lo que escaneó sigue sirviendo.
      let secreto: string;
      if (usuario.mfaSecreto) {
        secreto = descifrar(usuario.mfaSecreto);
      } else {
        const nuevo = generarSecretoMfa();
        secreto = nuevo.secreto;
        await repo.update(usuario.id, { mfaSecreto: nuevo.secretoCifrado, mfaHabilitado: false });
      }
      const qrCode = await generarQrMfa(usuario.email, secreto);
      return NextResponse.json({ success: true, qrCode, secret: secreto });
    }

    // Paso 2 de la activación: el usuario escribe el código de la app para demostrar que la configuró bien
    if (action === "verify") {
      if (usuario.mfaHabilitado) {
        return error("La verificación en dos pasos ya está activada.");
      }
      if (!usuario.mfaSecreto || !esCodigoTotp(code) || !verificarCodigoTotp(usuario.mfaSecreto, code)) {
        return error("El código no es correcto. Revisá tu app de autenticación.");
      }
      const { codigos, hashesGuardados } = await crearCodigosRecuperacion();
      await repo.update(usuario.id, { mfaHabilitado: true, mfaCodigosRecuperacion: hashesGuardados });
      // RF 1.4 - Solo se registran los cambios reales (no las consultas de estado ni la generación del QR)
      await registrarAuditoria({
        usuarioId: usuario.id, email: usuario.email, accion: "ACTIVAR_2FA", modulo: "Autenticación",
        entidadId: usuario.id, detalle: "Activó la verificación en dos pasos", ip: ipDelPedido(request.headers),
      });
      // Los códigos se muestran UNA sola vez; en la base solo queda su hash
      return NextResponse.json({ success: true, codigosRecuperacion: codigos });
    }

    // Desactivar: pide un código válido (de la app o de recuperación), no alcanza con tener la sesión abierta
    if (action === "disable") {
      if (!usuario.mfaHabilitado) {
        return error("La verificación en dos pasos no está activada.");
      }
      let codigoValido = false;
      if (esCodigoTotp(code) && usuario.mfaSecreto) {
        codigoValido = verificarCodigoTotp(usuario.mfaSecreto, code);
      } else {
        codigoValido = (await usarCodigoRecuperacion(usuario.mfaCodigosRecuperacion, code)) !== null;
      }
      if (!codigoValido) {
        return error("El código no es correcto.");
      }
      await repo.update(usuario.id, {
        mfaHabilitado: false,
        mfaSecreto: null,
        mfaCodigosRecuperacion: null,
      });
      await registrarAuditoria({
        usuarioId: usuario.id, email: usuario.email, accion: "DESACTIVAR_2FA", modulo: "Autenticación",
        entidadId: usuario.id, detalle: "Desactivó la verificación en dos pasos", ip: ipDelPedido(request.headers),
      });
      return NextResponse.json({ success: true });
    }

    return error("Acción no válida.");
  } catch {
    console.error("Error en /api/auth/mfa");
    return error("Error interno del servidor.", 500);
  }
}

