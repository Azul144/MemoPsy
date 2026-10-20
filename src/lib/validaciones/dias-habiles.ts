// src/lib/validaciones/dias-habiles.ts
// Las sesiones solo se atienden de lunes a viernes. Lo usan el calendario,
// los formularios y el servidor. Si cambia la regla, se cambia SOLO acá.

export const MENSAJE_DIA_NO_HABIL = "Las sesiones solo se pueden registrar de lunes a viernes."

// Días que se bloquean en el calendario (0 = domingo, 6 = sábado)
export const DIAS_NO_HABILES = [0, 6]

// La hora del consultorio: el servidor recibe fechas en UTC y un viernes a la
// noche en Argentina ya es sábado en UTC, así que el día se mira en esta zona.
const ZONA_HORARIA = "America/Argentina/Buenos_Aires"

// Para fechas del navegador (hora local)
export function esDiaHabil(fecha: Date): boolean {
  return !DIAS_NO_HABILES.includes(fecha.getDay())
}

// Para fechas del formulario en formato "yyyy-MM-dd"
export function esFechaHabil(fecha: string): boolean {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return esDiaHabil(new Date(anio, mes - 1, dia))
}

// Para el servidor: mira el día de la semana en la hora de Argentina
export function esDiaHabilEnConsultorio(fecha: Date): boolean {
  const dia = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: ZONA_HORARIA }).format(fecha)
  return dia !== "Sat" && dia !== "Sun"
}

// Si la fecha cae sábado o domingo, devuelve el lunes siguiente
export function proximoDiaHabil(fecha: Date): Date {
  const resultado = new Date(fecha)
  while (!esDiaHabil(resultado)) resultado.setDate(resultado.getDate() + 1)
  return resultado
}
