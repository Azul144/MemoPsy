// src/lib/carpetas/sesiones.ts
// Arma el recorrido del paciente sesión por sesión: junta el turno, la nota clínica y el informe
// de seguimiento de un mismo día, del primer día que vino al último.
// Lo usan la carpeta del paciente (pantalla) y el PDF de la historia clínica, así se ven igual.
// No toca la base: recibe las listas ya cargadas.

const ZONA = "America/Argentina/Buenos_Aires";

// "aaaa-mm-dd" en la hora del consultorio
export const diaDelConsultorio = (fecha: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(fecha));

interface ConFecha {
  fecha: string;
}
export interface TurnoDeSesion {
  inicio: string;
  fin: string | null;
  estado: string;
  modalidad: string;
}

export interface SesionDelRecorrido<T extends TurnoDeSesion, N extends ConFecha, S extends ConFecha> {
  numero: number;
  dia: string; // "aaaa-mm-dd"
  turnos: T[];
  notas: N[];
  seguimientos: S[];
}

// Solo entran los turnos que ya pasaron y no se cancelaron; los programados van aparte.
export function armarRecorrido<T extends TurnoDeSesion, N extends ConFecha, S extends ConFecha>(
  turnos: T[],
  notas: N[],
  seguimientos: S[],
  ahora = Date.now(),
): SesionDelRecorrido<T, N, S>[] {
  const porDia = new Map<string, Omit<SesionDelRecorrido<T, N, S>, "numero">>();
  const delDia = (fecha: string) => {
    const dia = diaDelConsultorio(fecha);
    if (!porDia.has(dia)) porDia.set(dia, { dia, turnos: [], notas: [], seguimientos: [] });
    return porDia.get(dia)!;
  };
  for (const t of turnos) {
    if (t.estado === "Cancelada" || new Date(t.inicio).getTime() >= ahora) continue;
    delDia(t.inicio).turnos.push(t);
  }
  for (const n of notas) delDia(n.fecha).notas.push(n);
  for (const s of seguimientos) delDia(s.fecha).seguimientos.push(s);

  const porFecha = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
  return [...porDia.values()]
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .map((s, i) => ({
      ...s,
      numero: i + 1,
      turnos: s.turnos.sort((a, b) => porFecha(a.inicio, b.inicio)),
      notas: s.notas.sort((a, b) => porFecha(a.fecha, b.fecha)),
      seguimientos: s.seguimientos.sort((a, b) => porFecha(a.fecha, b.fecha)),
    }));
}

// "jueves 19/11/2026"
export function diaLargo(dia: string) {
  const [a, m, d] = dia.split("-").map(Number);
  const nombre = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, d, 12)));
  return `${nombre} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

// "18:00"
export const horaDelConsultorio = (fecha: string) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(fecha));
