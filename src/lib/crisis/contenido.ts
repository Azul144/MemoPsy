// src/lib/crisis/contenido.ts
// RF 4.3 - Aviso de crisis al psicólogo. El paciente, con la sesión iniciada, toca un solo botón
// («Avisar a mi psicólogo/a») y MemoPsy le avisa a su psicólogo/a (campanita, WhatsApp y email) que está
// atravesando un momento difícil. No se le pide que elija qué le pasa: no pierde tiempo, y lo que lo
// disparó lo habla después en sesión. El sistema no da indicaciones ni técnicas: la intervención la
// decide el profesional que lo atiende.
//
// Teléfonos verificados el 17/11/2026 (se muestran siempre después de avisar, y en el chatbot):
//  - 911: emergencias.
//  - 0800 999 0091: Línea Nacional de Orientación y Apoyo en la Urgencia de Salud Mental
//    (Ministerio de Salud de la Nación), gratuita, 24 h, todo el país.

export interface LineaAyuda {
  numero: string
  marcar: string // lo que va en tel:
  nombre: string
  corto: string // descripción breve, para la tarjeta del sistema
}

export const LINEAS_EMERGENCIA: LineaAyuda[] = [
  { numero: "911", marcar: "911", nombre: "Emergencias", corto: "Emergencias" },
  { numero: "0800 999 0091", marcar: "08009990091", nombre: "Línea nacional de salud mental, gratuita, 24 h", corto: "Salud mental · gratis, las 24 h" },
]
