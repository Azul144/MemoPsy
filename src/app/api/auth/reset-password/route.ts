// src/app/api/auth/reset-password/route.ts
// Paso 2 de la recuperación: con el enlace secreto, la persona elige su contraseña nueva.
import { NextResponse } from "next/server";
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import * as bcrypt from "bcrypt";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { hashToken } from "@/lib/auth/recuperacion";
import { validarPassword } from "@/lib/validaciones/password";

const ENLACE_INVALIDO = { message: "El enlace no es válido o ya venció. Pedí uno nuevo." };

async function manejarPOST(request: Request) {
  let token = "";
  let password = "";
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  // Un token válido son exactamente 64 caracteres hexadecimales
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json(ENLACE_INVALIDO, { status: 400 });
  }

  try {
    const dataSource = await initializeDatabase();
    const repo = dataSource.getRepository(UsuarioEntity);

    // Buscamos por la HUELLA del token (en la base nunca está el token original)
    const usuario = await repo
      .createQueryBuilder("usuario")
      .where("usuario.reset_token_hash = :hash", { hash: hashToken(token) })
      .getOne();

    if (!usuario || !usuario.activo || !usuario.resetExpira || usuario.resetExpira < new Date()) {
      return NextResponse.json(ENLACE_INVALIDO, { status: 400 });
    }

    // Mismas reglas que muestra la pantalla (RNF02), verificadas en el servidor
    const errores = validarPassword(password, usuario.email);
    if (errores.length > 0) {
      return NextResponse.json(
        { message: "La contraseña no cumple los requisitos.", errores },
        { status: 400 }
      );
    }

    await repo.update(usuario.id, {
      password: await bcrypt.hash(password, 12),
      resetTokenHash: null, // el enlace ya no sirve más
      resetExpira: null,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });

    return NextResponse.json({ message: "Tu contraseña se actualizó. Ya podés iniciar sesión." });
  } catch {
    console.error("Error al restablecer una contraseña");
    return NextResponse.json({ message: "No se pudo actualizar la contraseña. Intentá de nuevo." }, { status: 500 });
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Autenticación", accion: "RESTABLECER_CONTRASENA", detalle: "Restablecimiento de contraseña por correo" })
