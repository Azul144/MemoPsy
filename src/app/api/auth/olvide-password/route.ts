// src/app/api/auth/olvide-password/route.ts
// Paso 1 de la recuperación: la persona escribe su email y, si existe, le mandamos el enlace.
import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { enviarEmail } from "@/lib/email/brevo";
import { generarToken, MINUTOS_VALIDEZ } from "@/lib/auth/recuperacion";
import { esEmailValido, normalizarEmail } from "@/lib/validaciones/password";

// SIEMPRE respondemos lo mismo, exista o no el email (así nadie averigua qué emails están registrados)
const RESPUESTA = {
  message: "Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.",
};

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  if (!esEmailValido(email)) {
    return NextResponse.json({ message: "Ingresá un email válido." }, { status: 400 });
  }

  try {
    const dataSource = await initializeDatabase();
    const repo = dataSource.getRepository(UsuarioEntity);
    const usuario = await repo
      .createQueryBuilder("usuario")
      .where("LOWER(usuario.email) = :email", { email: normalizarEmail(email) })
      .getOne();

    if (usuario && usuario.activo) {
      // Si ya pidió un enlace hace menos de 2 minutos, no mandamos otro (evita llenarle la casilla)
      const pidioHacePoco =
        usuario.resetExpira &&
        usuario.resetExpira.getTime() - Date.now() > (MINUTOS_VALIDEZ - 2) * 60 * 1000;

      if (!pidioHacePoco) {
        const { token, hash } = generarToken();
        await repo.update(usuario.id, {
          resetTokenHash: hash,
          resetExpira: new Date(Date.now() + MINUTOS_VALIDEZ * 60 * 1000),
        });

        const enlace = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
        await enviarEmail({
          para: usuario.email,
          asunto: "Restablecer tu contraseña de MemoPsy",
          html: plantillaEmail(enlace),
        });
      }
    }
  } catch {
    // No mostramos el error ni datos personales; la respuesta es la misma
    console.error("Error al procesar una solicitud de recuperación de contraseña");
  }

  return NextResponse.json(RESPUESTA);
}

function plantillaEmail(enlace: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #152B2B; color: #ffffff; padding: 32px; border-radius: 12px;">
      <h2 style="color: #F1C77A; margin-top: 0;">Restablecer tu contraseña</h2>
      <p>Recibimos un pedido para restablecer la contraseña de tu cuenta de MemoPsy.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${enlace}" style="background: #F1C77A; color: #152B2B; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Elegir contraseña nueva
        </a>
      </p>
      <p style="font-size: 13px; color: #cfd8d8;">El enlace vence en ${MINUTOS_VALIDEZ} minutos y sirve una sola vez.</p>
      <p style="font-size: 13px; color: #cfd8d8;">Si no fuiste vos, ignorá este mensaje: tu contraseña no cambia.</p>
    </div>
  `;
}