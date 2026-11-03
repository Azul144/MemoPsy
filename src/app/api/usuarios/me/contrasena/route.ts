// app/api/usuarios/me/contrasena/route.ts
// RF 1.3 - Cada usuario cambia su propia contraseña, con la política del RNF02.
import * as bcrypt from "bcrypt";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { registrarIntentoFallido } from "@/lib/auth/login";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { validarPassword } from "@/lib/validaciones/password";

async function manejarPOST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const actual = typeof body?.actual === "string" ? body.actual : "";
  const nueva = typeof body?.nueva === "string" ? body.nueva : "";

  try {
    const ds = await initializeDatabase();
    const repo = ds.getRepository(UsuarioEntity);
    const usuario = await repo.findOne({ where: { id: session.user.id } });
    if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      return NextResponse.json({ error: "Por muchos intentos fallidos, probá de nuevo en unos minutos." }, { status: 429 });
    }
    if (!(await bcrypt.compare(actual, usuario.password))) {
      await registrarIntentoFallido(repo, usuario);
      return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });
    }

    const errores = validarPassword(nueva, usuario.email);
    if (errores.length > 0) return NextResponse.json({ error: errores.join(". ") }, { status: 400 });
    if (await bcrypt.compare(nueva, usuario.password)) {
      return NextResponse.json({ error: "La contraseña nueva debe ser distinta de la actual." }, { status: 400 });
    }

    await repo.update(usuario.id, { password: await bcrypt.hash(nueva, 12), intentosFallidos: 0 });
    return NextResponse.json({ ok: true, id: usuario.id });
  } catch (error) {
    console.error("Error en POST /api/usuarios/me/contrasena:", (error as Error)?.name);
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 500 });
  }
}

// RF 1.4 - Queda en la auditoría, nunca con la contraseña
export const POST = conAuditoria(manejarPOST, { modulo: "Usuarios", accion: "CAMBIAR_CONTRASENA", detalle: "Cambio de la contraseña propia" });
