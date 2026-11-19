// src/lib/sesiones/turnos-atencion.ts
// RF 3.1 - Días y turnos en que atiende cada psicólogo.
// El consultorio atiende de lunes a viernes en dos turnos fijos: mañana (8 a 11) y tarde (18 a 21).
// Cada psicólogo marca qué turnos toma cada día (tabla horario_disponible, una fila por día y turno).
// Los turnos nuevos y los cambios de horario tienen que caer dentro de esos turnos.
// Lo usan el servidor y los formularios: si cambia la regla, se cambia SOLO acá.

export interface FranjaAtencion {
  diaSemana: number // 1 = lunes ... 5 = viernes
  horaInicio: string // "HH:mm" (o "HH:mm:ss" desde la base)
  horaFin: string
}

export const TURNOS = [
  { clave: "manana", nombre: "Mañana", horaInicio: "08:00", horaFin: "11:00", texto: "de 8 a 11" },
  { clave: "tarde", nombre: "Tarde", horaInicio: "18:00", horaFin: "21:00", texto: "de 18 a 21" },
] as const

export const DIAS_ATENCION = [
  { numero: 1, corto: "Lun", nombre: "lunes" },
  { numero: 2, corto: "Mar", nombre: "martes" },
  { numero: 3, corto: "Mié", nombre: "miércoles" },
  { numero: 4, corto: "Jue", nombre: "jueves" },
  { numero: 5, corto: "Vie", nombre: "viernes" },
] as const

export const MENSAJE_SIN_HORARIOS = "El psicólogo todavía no cargó sus días y horarios de atención."

const hhmm = (hora: string) => hora.slice(0, 5)

// ¿La franja es exactamente uno de los dos turnos del consultorio?
export function turnoDeFranja(franja: Pick<FranjaAtencion, "horaInicio" | "horaFin">) {
  return TURNOS.find((t) => t.horaInicio === hhmm(franja.horaInicio) && t.horaFin === hhmm(franja.horaFin)) ?? null
}

// "lunes, miércoles y viernes"
function listaDias(numeros: number[]): string {
  const nombres = numeros.map((n) => DIAS_ATENCION.find((d) => d.numero === n)?.nombre ?? "")
  if (numeros.length === 5) return "lunes a viernes"
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0] ?? ""
}

// "lunes a viernes de 8 a 11 y de 18 a 21" o "lunes a viernes de 8 a 11; martes y jueves de 18 a 21"
export function resumenAtencion(franjas: FranjaAtencion[]): string {
  const diasPorTurno = TURNOS.map((t) => ({
    turno: t,
    dias: [...new Set(franjas.filter((f) => turnoDeFranja(f)?.clave === t.clave).map((f) => f.diaSemana))].sort(),
  })).filter((x) => x.dias.length > 0)
  if (diasPorTurno.length === 2 && diasPorTurno[0].dias.join() === diasPorTurno[1].dias.join()) {
    return `${listaDias(diasPorTurno[0].dias)} ${diasPorTurno[0].turno.texto} y ${diasPorTurno[1].turno.texto}`
  }
  return diasPorTurno.map((x) => `${listaDias(x.dias)} ${x.turno.texto}`).join("; ")
}

// Valida un turno con el día de la semana (1 a 7) y las horas "HH:mm" en la hora del consultorio.
// Devuelve el mensaje de error, o null si el turno entra en uno de los turnos del psicólogo.
export function validarEnAtencion(
  franjas: FranjaAtencion[],
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  mismoDia = true,
): string | null {
  if (franjas.length === 0) return MENSAJE_SIN_HORARIOS
  const dentro =
    mismoDia &&
    franjas.some(
      (f) => f.diaSemana === diaSemana && hhmm(f.horaInicio) <= horaInicio && horaFin <= hhmm(f.horaFin) && horaInicio < horaFin,
    )
  if (dentro) return null
  return `Fuera del horario de atención del psicólogo. Atiende ${resumenAtencion(franjas)}.`
}

// Horas de inicio que se ofrecen en el formulario para un día: cada hora en punto de sus turnos
// en la que entra un turno de la duración pedida (en minutos)
export function horasDeInicio(franjas: FranjaAtencion[], diaSemana: number, duracionMin: number): string[] {
  const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
  const texto = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  const horas: string[] = []
  for (const f of franjas.filter((x) => x.diaSemana === diaSemana).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))) {
    for (let m = minutos(f.horaInicio); m + duracionMin <= minutos(f.horaFin); m += 60) horas.push(texto(m))
  }
  return horas
}

// --- Servidor: las fechas llegan en UTC y se miran en la hora de Argentina ---
const ZONA_HORARIA = "America/Argentina/Buenos_Aires"

function enConsultorio(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha)
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ""
  const dias = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return {
    dia: `${parte("year")}-${parte("month")}-${parte("day")}`,
    diaSemana: dias.indexOf(parte("weekday")) + 1,
    hora: `${parte("hour").replace("24", "00")}:${parte("minute")}`,
  }
}

export function validarFechasEnAtencion(franjas: FranjaAtencion[], inicio: Date, fin: Date): string | null {
  const a = enConsultorio(inicio)
  const b = enConsultorio(fin)
  return validarEnAtencion(franjas, a.diaSemana, a.hora, b.hora, a.dia === b.dia)
}
