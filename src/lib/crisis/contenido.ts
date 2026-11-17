// src/lib/crisis/contenido.ts
// Contenido de la página pública de ayuda en crisis (/crisis): teléfonos y pautas para cada situación.
// Es orientación general para atravesar el momento. No reemplaza la atención profesional ni una guardia.
// Conviene que un/a profesional de salud mental revise estos textos antes de usarlos con pacientes reales.
//
// Teléfonos verificados el 17/11/2026:
//  - 911 y 107: emergencias y ambulancia (en Formosa la ambulancia es el 107; argentina.gob.ar/tema/emergencias).
//  - 0800 999 0091: Línea Nacional de Orientación y Apoyo en la Urgencia de Salud Mental
//    (Ministerio de Salud de la Nación), gratuita, 24 h, todo el país.
//  - 0800 345 1435: Centro de Asistencia al Suicida, gratuita, 24 h, todo el país.

export interface LineaAyuda {
  numero: string
  marcar: string // lo que va en tel:
  nombre: string
  detalle: string
  urgente?: boolean
}

export const LINEAS_AYUDA: LineaAyuda[] = [
  { numero: "911", marcar: "911", nombre: "Emergencias", detalle: "Si tu vida o la de otra persona corre peligro ahora.", urgente: true },
  { numero: "107", marcar: "107", nombre: "Ambulancia", detalle: "Si te lastimaste o tomaste algo que te puede hacer daño.", urgente: true },
  {
    numero: "0800 999 0091",
    marcar: "08009990091",
    nombre: "Línea nacional de salud mental",
    detalle: "Gratuita, las 24 horas. Te atienden psicólogos/as.",
  },
  {
    numero: "0800 345 1435",
    marcar: "08003451435",
    nombre: "Centro de Asistencia al Suicida",
    detalle: "Gratuita, las 24 horas, desde todo el país.",
  },
]

export type Ejercicio = "respiracion" | "sentidos"

export interface GuiaCrisis {
  id: string
  titulo: string
  subtitulo: string
  // Situación de riesgo: se muestran primero los teléfonos y el aviso de no quedarse solo/a
  riesgo?: boolean
  apertura: string
  pasos: string[]
  ejercicio?: Ejercicio
  cierre: string
}

export const GUIAS: GuiaCrisis[] = [
  {
    id: "dano",
    titulo: "Pienso en hacerme daño o en no seguir viviendo",
    subtitulo: "No tenés que atravesarlo solo/a",
    riesgo: true,
    apertura:
      "Lo que sentís ahora es muy doloroso, y pedir ayuda es lo correcto. Estos pensamientos pueden ser muy intensos, pero suelen bajar con el tiempo y con compañía.",
    pasos: [
      "Llamá ahora a una de las líneas de arriba. Son gratuitas, atienden las 24 horas y no te van a juzgar.",
      "Si estás en peligro inmediato, llamá al 911 o andá a la guardia del hospital más cercano.",
      "No te quedes solo/a: escribile o llamá a alguien de confianza y pedile que venga o que se quede con vos.",
      "Alejate de lo que podrías usar para lastimarte (medicamentos, objetos, alcohol) o pedile a alguien que lo guarde.",
      "Por ahora, concentrate solo en los próximos minutos. No hace falta resolver todo hoy.",
    ],
    ejercicio: "respiracion",
    cierre: "Cuando pase el momento más difícil, contáselo a tu psicólogo/a. Es importante que lo sepa.",
  },
  {
    id: "panico",
    titulo: "Siento pánico o mucha ansiedad",
    subtitulo: "El corazón acelerado, falta de aire, miedo intenso",
    apertura:
      "Un ataque de pánico asusta mucho, pero no es peligroso y pasa: suele llegar a su punto más alto en unos minutos y después baja. Tu cuerpo está en alerta, y lo podés ayudar a calmarse.",
    pasos: [
      "Si podés, sentate o apoyá la espalda en una pared. Apoyá los pies firmes en el piso.",
      "Respirá más lento, soltando el aire más despacio de lo que lo tomás. Usá la guía de abajo.",
      "Decite: «Esto es ansiedad. Es muy incómodo, pero va a pasar».",
      "Si los pensamientos van muy rápido, usá tus sentidos para volver al presente (ejercicio 5-4-3-2-1).",
      "No hace falta que la ansiedad desaparezca de golpe: alcanza con que baje un poco.",
    ],
    ejercicio: "respiracion",
    cierre:
      "Si el dolor en el pecho no se va, es la primera vez que te pasa o te sentís cada vez peor, llamá al 107 para descartar un problema físico.",
  },
  {
    id: "angustia",
    titulo: "Siento una angustia o tristeza muy fuerte",
    subtitulo: "Llanto que no para, un dolor que no sé cómo manejar",
    apertura: "Está bien sentirse así y está bien llorar. Las emociones, aunque sean muy fuertes, cambian y bajan de intensidad.",
    pasos: [
      "Buscá un lugar donde te sientas un poco más seguro/a y cómodo/a.",
      "Respirá lento unos minutos con la guía de abajo.",
      "Hacé algo pequeño y concreto para tu cuerpo: tomá agua, abrigate, lavate la cara con agua fresca.",
      "Hablá con alguien de confianza. No hace falta explicar todo: alcanza con decir «hoy estoy mal, ¿podés acompañarme un rato?».",
      "Si escribir te ayuda, anotá lo que sentís. Podés llevarlo a tu próxima sesión.",
    ],
    ejercicio: "respiracion",
    cierre: "Si la angustia viene con ganas de hacerte daño, volvé atrás y elegí esa opción, o llamá a una de las líneas.",
  },
  {
    id: "enojo",
    titulo: "Siento mucho enojo o impulsos difíciles de controlar",
    subtitulo: "Ganas de romper algo, gritar o hacer algo de lo que me puedo arrepentir",
    apertura: "El enojo es una emoción válida. Lo importante ahora es darte tiempo antes de actuar, para cuidarte a vos y a los demás.",
    pasos: [
      "Alejate de la situación o de la persona, aunque sea unos minutos. Decí: «Necesito un momento».",
      "No tomes decisiones ni mandes mensajes ahora: esperá a que baje la intensidad.",
      "Descargá la energía de forma segura: caminá rápido, apretá algo blando, mojate las manos y la cara con agua fría.",
      "Respirá lento con la guía de abajo, soltando el aire bien despacio.",
      "Cuando estés más tranquilo/a, pensá qué necesitás y cómo pedirlo.",
    ],
    ejercicio: "respiracion",
    cierre: "Si sentís que podés lastimar a alguien o a vos mismo/a, alejate y llamá al 911 o a una de las líneas.",
  },
  {
    id: "desconexion",
    titulo: "Me siento desconectado/a, como si nada fuera real",
    subtitulo: "Como en una niebla, lejos de mi cuerpo o de lo que pasa",
    apertura:
      "Esta sensación es una forma en que la mente se protege cuando algo es demasiado. Es desagradable, pero pasa. Lo que ayuda es volver de a poco al aquí y ahora.",
    pasos: [
      "Nombrá en voz alta dónde estás, qué día es y qué hora es.",
      "Sentí tu cuerpo: apoyá los pies en el piso, tocá una superficie y notá su textura y su temperatura.",
      "Usá tus sentidos con el ejercicio 5-4-3-2-1 de abajo.",
      "Sostené algo frío o con olor fuerte (un hielo, un café, una crema) y prestale atención.",
      "Si podés, hablá con alguien: escuchar una voz conocida ayuda a volver.",
    ],
    ejercicio: "sentidos",
    cierre: "Si te pasa seguido, contáselo a tu psicólogo/a para trabajarlo en sesión.",
  },
  {
    id: "acompanar",
    titulo: "Alguien cercano está en crisis",
    subtitulo: "Quiero ayudar y no sé cómo",
    apertura: "Tu compañía puede hacer una gran diferencia. No hace falta tener las palabras justas: lo importante es estar.",
    pasos: [
      "Quedate con la persona y hablá con calma. Escuchá sin juzgar ni discutir lo que siente.",
      "Si dice que quiere hacerse daño o morir, tomalo en serio y no la dejes sola: llamá al 911 o a una de las líneas.",
      "Alejá lo que pueda usar para lastimarse (medicamentos, objetos, alcohol).",
      "Si tiene un ataque de pánico, respirá lento junto con ella usando la guía de abajo.",
      "Ayudala a contactar a su psicólogo/a o a un servicio de salud cuando pase el momento.",
    ],
    ejercicio: "respiracion",
    cierre: "Cuidarte también importa: después, hablá con alguien de lo que pasó.",
  },
]
