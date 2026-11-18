// src/lib/whatsapp/crisis.ts
// Detección de mensajes de crisis en el chatbot de WhatsApp y respuesta de contención.
//
// Criterios de seguridad (conviene que los revise un profesional de salud mental):
//  - La detección es por palabras y frases fijas, no por inteligencia artificial: es predecible,
//    se puede auditar y no manda el mensaje del paciente a ningún servicio externo.
//  - Ante la duda, se responde como crisis: es preferible una falsa alarma a no responder.
//  - La respuesta es siempre un texto fijo (el mismo contenido de la página /crisis). Nunca se improvisa.
//  - El bot aclara que no es una persona y que el consultorio no lee los mensajes en todo momento.
import { LINEAS_AYUDA } from "@/lib/crisis/contenido";

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
  return LINEAS_AYUDA.map((l) => `📞 *${l.numero}* — ${l.nombre}. ${l.detalle}`).join("\n");
}

// Texto fijo que responde el bot. urlCrisis: dirección pública de la página /crisis.
// avisado: si se le avisó al psicólogo (solo cuando el celular es de un paciente conocido).
export function respuestaCrisis(nivel: NivelCrisis, urlCrisis: string, avisado: boolean): string {
  const apertura =
    nivel === "riesgo"
      ? "Gracias por escribir. Lo que estás sintiendo es muy importante y no tenés que atravesarlo solo/a.\n\n" +
        "*Si estás en peligro ahora, llamá al 911* o andá a la guardia del hospital más cercano."
      : "Gracias por escribir. Lo que te pasa es importante y pedir ayuda está bien.";
  return [
    apertura,
    "",
    "Podés llamar ya mismo, gratis y a cualquier hora:",
    lineas(),
    "",
    `Mientras tanto, esta guía te acompaña paso a paso (con un ejercicio de respiración): ${urlCrisis}`,
    "",
    nivel === "riesgo"
      ? "Si podés, pedile a alguien de confianza que venga o que se quede con vos, y alejate de lo que podrías usar para lastimarte."
      : "Probá respirar despacio: tomá aire en 4 tiempos, sostenelo 4 y soltalo en 6. Repetilo unas veces.",
    "",
    (avisado ? "Le avisamos a tu psicólogo/a que escribiste. " : "") +
      "Importante: este es un número automático de MemoPsy, no una persona, y el consultorio no lee " +
      "los mensajes en todo momento. Ante una urgencia, usá las líneas de arriba.",
  ].join("\n");
}
