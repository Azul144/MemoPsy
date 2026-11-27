// src/lib/email/bienvenida-paciente.ts
// Email de bienvenida al paciente nuevo: el consultorio le da acceso a MemoPsy y el paciente crea su propia
// contraseña con un enlace personal. Así nadie tiene que mandarle la contraseña por WhatsApp, y el paciente
// entra directo al sistema, sin pasar por la portada (que está pensada para el psicólogo).
// Usa el mismo mecanismo que «Olvidé mi contraseña»: en la base se guarda solo la huella del enlace.
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { generarToken } from "@/lib/auth/recuperacion";
import { enviarEmail } from "./brevo";
import { lista, marcoEmail, parrafo, sitioMemoPsy } from "./plantilla";

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

    const sitio = sitioMemoPsy();
    await enviarEmail({
      para: email,
      asunto: "Tu psicólogo/a te dio acceso a MemoPsy",
      html: htmlBienvenida(nombre, `${sitio}/reset-password?token=${token}&bienvenida=1`, `${sitio}/login`),
    });
    return "enviada";
  } catch {
    console.error("No se pudo enviar el email de bienvenida al paciente");
    return "error";
  }
}

// Contenido del email (exportado para poder verlo en el navegador sin mandarlo)
export function htmlBienvenida(nombre: string, enlace: string, login: string): string {
  const nombreSeguro = nombre.replace(/[&<>"]/g, "");
  return marcoEmail({
    resumen: "Creá tu contraseña para ver tus turnos y lo que te deja tu psicólogo/a.",
    titulo: `¡Hola, ${nombreSeguro}! Ya tenés tu cuenta`,
    cuerpo:
      parrafo("Tu consultorio te dio acceso a MemoPsy. Desde tu cuenta vas a poder:") +
      lista([
        "Ver tus próximos turnos y confirmarlos",
        "Entrar a la videollamada con un toque, si la sesión es remota",
        "Reprogramar una sesión sin tener que llamar",
        "Recibir las pautas y actividades que te deje tu psicólogo/a",
      ]) +
      parrafo("Para empezar, creá tu contraseña:"),
    boton: { texto: "Crear mi contraseña", enlace },
    notas: [
      `El enlace es personal, vence en ${HORAS_VALIDEZ_BIENVENIDA / 24} días y sirve una sola vez. Si vence, entrá a MemoPsy y tocá «¿La olvidaste?» con este mismo email.`,
      `Para entrar después: <a href="${login}" style="color: #1D4A48;">${login.replace(/^https?:\/\//, "")}</a>`,
    ],
  });
}
