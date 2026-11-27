// src/components/sesiones/AgendaDelPsicologo.tsx
// Para la recepción: elegir de qué psicólogo ver la agenda y, para el día marcado en el calendario,
// los horarios que tiene libres dentro de sus franjas de atención (mañana 8 a 11, tarde-noche 18 a 21).
// Al tocar un horario libre se abre "Nuevo turno" con el psicólogo, el día y la hora ya cargados.
"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TURNOS } from "@/lib/sesiones/turnos-atencion";

export interface PsicologoDeAgenda {
  id: string;
  persona: { nombre: string; apellido: string };
}
interface TurnoOcupado {
  fechaHoraInicio: string;
  fechaHoraFin: string;
  psicologo?: { id: string } | null;
  estado?: { nombre: string } | null;
}
export interface HorarioElegido {
  fecha: string; // aaaa-mm-dd
  horaInicio: string; // HH:mm
  horaFin: string;
  psicologo: PsicologoDeAgenda;
}

const DURACION_MIN = 50; // una sesión
const PASO_MIN = 60; // un turno por hora
const TODOS = "todos";

const dos = (n: number) => String(n).padStart(2, "0");
const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const aHora = (min: number) => `${dos(Math.floor(min / 60))}:${dos(min % 60)}`;
const diaTexto = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
// Getters locales del navegador: el consultorio y la recepción están en la misma zona horaria
const enFecha = (dia: string, min: number) => new Date(`${dia}T${aHora(min)}:00`);

export default function AgendaDelPsicologo({
  psicologos,
  psicologoId,
  onCambiarPsicologo,
  fecha,
  sesiones,
  onElegir,
}: {
  psicologos: PsicologoDeAgenda[];
  psicologoId: string;
  onCambiarPsicologo: (id: string) => void;
  fecha: Date;
  sesiones: TurnoOcupado[];
  onElegir: (horario: HorarioElegido) => void;
}) {
  const [franjas, setFranjas] = useState<{ diaSemana: number; horaInicio: string; horaFin: string }[] | null>(null);
  const psicologo = psicologos.find((p) => p.id === psicologoId) ?? null;

  useEffect(() => {
    if (!psicologoId) return;
    setFranjas(null);
    fetch(`/api/horarios-disponibles?psicologoId=${psicologoId}`)
      .then((r) => (r.ok ? r.json() : { franjas: [] }))
      .then((d) => setFranjas(d.franjas ?? []))
      .catch(() => setFranjas([]));
  }, [psicologoId]);

  const dia = diaTexto(fecha);
  const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
  const ocupados = sesiones.filter((s) => String(s.psicologo?.id ?? "") === psicologoId && s.estado?.nombre !== "Cancelada");

  const libresPorFranja = TURNOS.map((t) => {
    const franja = (franjas ?? []).find((f) => f.diaSemana === diaSemana && f.horaInicio === t.horaInicio);
    if (!franja) return { turno: t, atiende: false, libres: [] as number[] };
    const libres: number[] = [];
    for (let m = aMinutos(franja.horaInicio); m + DURACION_MIN <= aMinutos(franja.horaFin); m += PASO_MIN) {
      const inicio = enFecha(dia, m);
      const fin = enFecha(dia, m + DURACION_MIN);
      if (inicio.getTime() <= Date.now()) continue;
      const pisa = ocupados.some((s) => new Date(s.fechaHoraInicio) < fin && new Date(s.fechaHoraFin) > inicio);
      if (!pisa) libres.push(m);
    }
    return { turno: t, atiende: true, libres };
  });

  return (
    <div className="mb-4 space-y-3 rounded-md border p-3" style={{ backgroundColor: "var(--background)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Agenda de</span>
        <Select value={psicologoId || TODOS} onValueChange={(v) => onCambiarPsicologo(v === TODOS ? "" : v)}>
          <SelectTrigger className="w-full border-borde-fuerte bg-card text-foreground sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los psicólogos</SelectItem>
            {psicologos.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.persona.nombre} {p.persona.apellido}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!psicologo ? (
        <p className="text-xs text-tenue">Elegí un psicólogo para ver solo sus turnos y los horarios que tiene libres.</p>
      ) : franjas === null ? (
        <p className="flex items-center gap-2 text-xs text-tenue"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando horarios…</p>
      ) : libresPorFranja.every((f) => !f.atiende) ? (
        <p className="text-xs text-tenue">{psicologo.persona.nombre} no atiende este día.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-tenue">Horarios libres de {psicologo.persona.nombre} este día. Tocá uno para dar el turno.</p>
          {libresPorFranja.filter((f) => f.atiende).map(({ turno, libres }) => (
            <div key={turno.clave} className="flex flex-wrap items-center gap-2">
              <span className="flex w-28 items-center gap-1.5 text-sm text-dorado">
                {turno.clave === "manana" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {turno.clave === "manana" ? "Mañana" : "Tarde-noche"}
              </span>
              {libres.length === 0 ? (
                <span className="text-xs text-tenue">Sin horarios libres</span>
              ) : (
                libres.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onElegir({ fecha: dia, horaInicio: aHora(m), horaFin: aHora(m + DURACION_MIN), psicologo })}
                    className="inline-flex items-center gap-1 rounded-full border border-dorado/60 px-3 py-1 text-sm text-dorado transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Clock className="h-3.5 w-3.5" /> {aHora(m)}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
