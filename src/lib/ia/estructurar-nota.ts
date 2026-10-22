// src/lib/ia/estructurar-nota.ts
// Ordena con IA (Claude) el texto dictado de una nota clínica en tres apartados.
// Solo propone: el profesional revisa la propuesta antes de guardar nada.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

const MODELO = "claude-opus-5-5";

const NotaEstructurada = z.object({
  motivoConsulta: z.string(),
  observaciones: z.string(),
  plan: z.string(),
});
export type NotaEstructurada = z.infer<typeof NotaEstructurada>;

const INSTRUCCIONES = `Sos un asistente que ayuda a psicólogos de Argentina a ordenar sus notas clínicas.
Recibís un texto dictado por voz, que suele venir sin puntuación y con errores de reconocimiento.
Repartí su contenido en tres apartados:
- motivoConsulta: por qué consulta el paciente o qué trae a la sesión.
- observaciones: lo que se observó o trabajó durante la sesión.
- plan: lo que se acordó o se va a hacer en adelante.

Reglas:
- Usá solo lo que dice el texto. No agregues diagnósticos, interpretaciones ni datos nuevos.
- Corregí puntuación, mayúsculas y errores de dictado evidentes, manteniendo las palabras del profesional.
- Escribí en español rioplatense, en tercera persona, con el tono de una nota clínica.
- Si el texto no menciona algo de un apartado, dejalo como texto vacío.`;

export class IaNoConfiguradaError extends Error {}
export class IaRechazoError extends Error {}

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function estructurarNota(texto: string): Promise<NotaEstructurada> {
  if (!iaConfigurada()) throw new IaNoConfiguradaError("Falta configurar ANTHROPIC_API_KEY");

  const cliente = new Anthropic();
  const respuesta = await cliente.beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    // Si el modelo declina por sus filtros de seguridad, la API reintenta sola con otro modelo
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(NotaEstructurada) },
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: texto }],
  });

  if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) {
    throw new IaRechazoError("La IA no devolvió una propuesta");
  }
  return respuesta.parsed_output;
}

// Arma el texto final con los tres apartados, salteando los que quedaron vacíos
export function notaComoTexto(nota: NotaEstructurada): string {
  return [
    ["Motivo de consulta", nota.motivoConsulta],
    ["Observaciones", nota.observaciones],
    ["Plan", nota.plan],
  ]
    .filter(([, contenido]) => contenido.trim())
    .map(([titulo, contenido]) => `${titulo}:\n${contenido.trim()}`)
    .join("\n\n");
}
