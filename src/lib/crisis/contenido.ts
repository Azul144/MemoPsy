// src/lib/crisis/contenido.ts
// RF 4.3 - Aviso de crisis al psicólogo. El paciente, con la sesión iniciada, elige qué le está pasando
// y MemoPsy se lo avisa a su psicólogo/a (campanita, WhatsApp y email). El sistema no da indicaciones
// ni técnicas: la intervención la decide el profesional que lo atiende.
//
// Teléfonos verificados el 17/11/2026 (solo se muestran ante la opción de riesgo y en el chatbot):
//  - 911: emergencias.
//  - 0800 999 0091: Línea Nacional de Orientación y Apoyo en la Urgencia de Salud Mental
//    (Ministerio de Salud de la Nación), gratuita, 24 h, todo el país.

export interface LineaAyuda {
  numero: string
  marcar: string // lo que va en tel:
  nombre: string
}

export const LINEAS_EMERGENCIA: LineaAyuda[] = [
  { numero: "911", marcar: "911", nombre: "Emergencias" },
  { numero: "0800 999 0091", marcar: "08009990091", nombre: "Línea nacional de salud mental, gratuita, 24 h" },
]

export interface SituacionCrisis {
  id: string
  titulo: string
  subtitulo: string
  // Situación de riesgo: el aviso al psicólogo es urgente y se muestran los teléfonos de emergencia
  riesgo?: boolean
}

export const SITUACIONES_CRISIS: SituacionCrisis[] = [
  { id: "ansiedad", titulo: "Ansiedad o ataque de pánico", subtitulo: "Corazón acelerado, falta de aire, miedo intenso" },
  { id: "estres", titulo: "Estrés o desborde", subtitulo: "Siento que no puedo con todo lo que tengo encima" },
  { id: "angustia", titulo: "Angustia o tristeza muy fuerte", subtitulo: "Llanto que no para, un dolor difícil de manejar" },
  { id: "enojo", titulo: "Enojo o impulsos difíciles de controlar", subtitulo: "Ganas de gritar, romper algo o hacer algo de lo que me arrepienta" },
  { id: "desconexion", titulo: "Me siento desconectado/a", subtitulo: "Como si nada fuera real, lejos de mi cuerpo" },
  { id: "otra", titulo: "Otra situación", subtitulo: "Algo que no está en la lista: lo hablás con tu psicólogo/a" },
  {
    id: "dano",
    titulo: "Pienso en hacerme daño o en no seguir viviendo",
    subtitulo: "Tu psicólogo/a recibe un aviso urgente",
    riesgo: true,
  },
]
