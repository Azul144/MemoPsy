// src/lib/email/bienvenida-paciente.ts
// Email de bienvenida al paciente nuevo: el consultorio le da acceso a MemoPsy y el paciente crea su propia
// contraseña con un enlace personal. Así nadie tiene que mandarle la contraseña por WhatsApp, y el paciente
// entra directo al sistema, sin pasar por la portada (que está pensada para el psicólogo).
// Usa el mismo mecanismo que «Olvidé mi contraseña»: en la base se guarda solo la huella del enlace.
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { generarToken } from "@/lib/auth/recuperacion";
import { enviarEmail } from "./brevo";

// El paciente puede tardar en ver el correo: el enlace de bienvenida dura más que el de recuperación
export const HORAS_VALIDEZ_BIENVENIDA = 72;

export type ResultadoBienvenida = "enviada" | "sin-casilla" | "error";

export async function enviarBienvenidaPaciente(usuarioId: number, email: string, nombre: string): Promise<ResultadoBienvenida> {
  // Las cuentas de demostración (@...test) no tienen casilla real
  if (/\.test$/i.test(email)) return "sin-casilla";

  try {
    const { token, hash } = generarToken();
    const dataSource = await initializeDatabase();
    await dataSource.getRepository(UsuarioEntity).update(usuarioId, {
      resetTokenHash: hash,
      resetExpira: new Date(Date.now() + HORAS_VALIDEZ_BIENVENIDA * 60 * 60 * 1000),
    });

    const sitio = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
    const enlace = `${sitio}/reset-password?token=${token}&bienvenida=1`;
    await enviarEmail({
      para: email,
      asunto: "Tu psicólogo/a te dio acceso a MemoPsy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #152B2B; color: #ffffff; padding: 32px; border-radius: 12px;">
          <h2 style="color: #F1C77A; margin-top: 0;">¡Hola, ${nombre}!</h2>
          <p>Tu consultorio te creó una cuenta en MemoPsy. Desde ahí vas a ver tus turnos, entrar a las videollamadas,
          reprogramar una sesión y recibir lo que tu psicólogo/a te deje entre una sesión y otra.</p>
          <p>Para empezar, creá tu contraseña:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${enlace}" style="background: #F1C77A; color: #152B2B; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Crear mi contraseña
            </a>
          </p>
          <p style="font-size: 13px; color: #cfd8d8;">El enlace es personal, vence en ${HORAS_VALIDEZ_BIENVENIDA / 24} días y sirve una sola vez.
          Si vence, entrá a MemoPsy y tocá «¿La olvidaste?» con este mismo email.</p>
          <p style="font-size: 13px; color: #cfd8d8;">Para entrar después: ${sitio}/login</p>
        </div>`,
    });
    return "enviada";
  } catch {
    console.error("No se pudo enviar el email de bienvenida al paciente");
    return "error";
  }
}
