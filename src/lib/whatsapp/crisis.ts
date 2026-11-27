// src/lib/whatsapp/crisis.ts
// Detección de mensajes de crisis en el chatbot de WhatsApp y respuesta de contención.
//
// Criterios de seguridad (conviene que los revise un profesional de salud mental):
//  - La detección es por palabras y frases fijas, no por inteligencia artificial: es predecible,
//    se puede auditar y no manda el mensaje del paciente a ningún servicio externo.
//  - Ante la duda, se responde como crisis: es preferible una falsa alarma a no responder.
//  - La respuesta es siempre un texto fijo: avisa al psicólogo y da el 911 y la línea nacional. Nunca se
//    improvisa ni se dan indicaciones o técnicas: eso lo decide el profesional.
//  - El bot aclara que no es una persona y que el consultorio no lee los mensajes en todo momento.
import { LINEAS_EMERGENCIA } from "@/lib/crisis/contenido";

export type NivelCrisis = "riesgo" | "malestar";

// Sin mayúsculas, sin acentos y con un solo espacio entre palabras
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Riesgo para la vida o la integridad: ideas de suicidio, autolesiones, haber tomado algo
const RIESGO: RegExp[] = [
  /suicid/,
  /\b(me (quiero|voy a|tendria que)|quisiera|ganas de) (matar(me)?|morir(me)?)\b/,
  /\bmatarme\b/,
  /\bquiero morir/,
  /\bno quiero (seguir )?vivir\b/,
  /\bno quiero (estar|seguir) (mas )?viv[oa]\b/,
  /\b(no tiene|no le encuentro) sentido (vivir|seguir|la vida)\b/,
  /\bquitarme la vida\b/,
  /\b(hacerme|me hice|me estoy haciendo) dano\b/,
  /\b(lastimarme|me lastime|me estoy lastimando)\b/,
  /\b(cortarme|me corte|me estoy cortando)\b/,
  /\bautolesi/,
  /\b(terminar|acabar) con todo\b/,
  /\bdesaparecer para siempre\b/,
  /\bmejor (muerto|muerta)\b/,
  /\b(me tome|tome|tomar) (todas las )?(pastillas|remedios|medicamentos)\b/,
  /\bsobredosis\b/,
  /\bme quiero tirar\b/,
  /\bno (aguanto|soporto) mas\b/,
];

// Malestar intenso: pide ayuda o describe una crisis sin mencionar riesgo directo
const MALESTAR: RegExp[] = [
  /\bcrisis\b/,
  /\b(ataque|crisis) de (panico|ansiedad|angustia|nervios)\b/,
  /\bpanico\b/,
  /\bme (estoy )?(ahogando|muriendo)\b/,
  /\bno puedo respirar\b/,
  /\bayuda(me)? (urgente|por favor)\b|\bnecesito ayuda\b|\bsocorro\b|\bauxilio\b/,
  /\bestoy (muy )?mal\b/,
  /\bno se que hacer\b/,
  /\bme siento (muy )?(mal|desesperad[oa]|sol[oa])\b/,
];

export function detectarCrisis(texto: string): NivelCrisis | null {
  const t = normalizar(texto);
  if (!t) return null;
  if (RIESGO.some((r) => r.test(t))) return "riesgo";
  if (MALESTAR.some((r) => r.test(t))) return "malestar";
  return null;
}

function lineas(): string {
  return LINEAS_EMERGENCIA.map((l) => `📞 *${l.numero}* — ${l.nombre}`).join("\n");
}

// Texto fijo que responde el bot. urlAviso: dirección de la pantalla «Avisar a mi psicólogo/a» de MemoPsy.
// avisado: si se le avisó al psicólogo (solo cuando el celular es de un paciente conocido).
export function respuestaCrisis(nivel: NivelCrisis, urlAviso: string, avisado: boolean): string {
  return [
    "Gracias por escribir. Lo que te pasa es importante.",
    "",
    avisado
      ? "Ya le avisamos a tu psicólogo/a que escribiste: se va a comunicar con vos cuando lo vea."
      : `Podés avisarle a tu psicólogo/a desde MemoPsy: ${urlAviso}`,
    "",
    (nivel === "riesgo" ? "*Si estás en peligro ahora, no esperes: llamá.*" : "Si estás en peligro, llamá:"),
    lineas(),
    "",
    "Este es un número automático de MemoPsy, no una persona, y el consultorio no lee los mensajes en todo momento.",
  ].join("\n");
}
