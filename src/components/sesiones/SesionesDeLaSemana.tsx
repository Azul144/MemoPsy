// src/components/sesiones/SesionesDeLaSemana.tsx
// "Mis sesiones" del paciente: las sesiones de esta semana (de lunes a domingo) y cómo entrar a
// cada una (videollamada o presencial en el consultorio). Debajo, las que vienen después.
// Del lado del paciente se habla de "sesiones" (el psicólogo da "turnos").
"use client";

import { CalendarClock, MapPin, Moon, Sun, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SesionDelPaciente {
  id: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  psicologo?: { persona: { nombre: string; apellido: string } } | null;
  modalidad?: { nombre: string } | null;
  estado?: { nombre: string } | null;
  enlaceVideollamada?: string | null;
}

const ZONA = "America/Argentina/Buenos_Aires";
const UN_DIA = 24 * 60 * 60 * 1000;
const dia = (iso: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
const hora = (iso: string) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(iso));
const diaLargo = (iso: string) => new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA }).format(new Date(iso));
// Lunes y domingo de esta semana, "aaaa-mm-dd"
function semanaActual() {
  const [a, m, d] = dia(new Date()).split("-").map(Number);
  const hoy = new Date(Date.UTC(a, m - 1, d));
  const lunes = new Date(hoy.getTime() - ((hoy.getUTCDay() + 6) % 7) * UN_DIA);
  return { lunes: lunes.toISOString().slice(0, 10), domingo: new Date(lunes.getTime() + 6 * UN_DIA).toISOString().slice(0, 10) };
}

const COLOR_ESTADO: Record<string, string> = {
  Confirmada: "bg-emerald-500/20 text-exito border-emerald-500/40",
  Pendiente: "bg-amber-500/20 text-aviso border-amber-500/40",
  Reprogramada: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  Finalizada: "bg-sky-500/20 text-info border-sky-500/40",
};

function TarjetaSesion({ s, onReprogramar, compacta }: { s: SesionDelPaciente; onReprogramar: (s: SesionDelPaciente) => void; compacta?: boolean }) {
  const remota = s.modalidad?.nombre === "Remota";
  const inicio = new Date(s.fechaHoraInicio).getTime();
  const fin = new Date(s.fechaHoraFin).getTime();
  const yaFue = fin < Date.now() || s.estado?.nombre === "Finalizada";
  const puedeReprogramar = !yaFue && inicio - Date.now() >= UN_DIA;
  const manana = Number(hora(s.fechaHoraInicio).slice(0, 2)) < 14;
  const psicologo = s.psicologo ? `${s.psicologo.persona.nombre} ${s.psicologo.persona.apellido}` : null;

  return (
    <li className={cn("rounded-2xl border border-foreground/10 bg-background p-4", yaFue && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            {manana ? <Sun className="h-5 w-5 text-dorado" /> : <Moon className="h-5 w-5 text-dorado" />}
          </span>
          <div>
            <p className={cn("font-semibold text-foreground first-letter:uppercase", !compacta && "text-lg")}>{diaLargo(s.fechaHoraInicio)}</p>
            <p className="text-sm text-suave">
              {hora(s.fechaHoraInicio)} a {hora(s.fechaHoraFin)}
              {psicologo && ` · con ${psicologo}`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={COLOR_ESTADO[s.estado?.nombre ?? ""] ?? ""}>
          {yaFue ? "Ya fue" : s.estado?.nombre}
        </Badge>
      </div>

      {/* Cómo entrar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borde/60 pt-3">
        {remota ? (
          <>
            <span className="flex items-center gap-1.5 text-sm text-texto-2">
              <Video className="h-4 w-4 text-dorado" /> Por videollamada
            </span>
            {!yaFue &&
              (s.enlaceVideollamada ? (
                <Button asChild size="sm" className="ml-auto h-9 gap-1.5 rounded-full bg-primary text-primary-foreground">
                  <a href={s.enlaceVideollamada} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4" /> Entrar a la videollamada
                  </a>
                </Button>
              ) : (
                <span className="ml-auto text-xs text-tenue">El enlace aparece acá cuando tu psicólogo/a lo cargue.</span>
              ))}
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-texto-2">
            <MapPin className="h-4 w-4 text-dorado" /> Presencial, en el consultorio
          </span>
        )}
        {puedeReprogramar && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReprogramar(s)}
            className={cn("h-9 gap-1.5 rounded-full border-dorado/60 text-dorado", !remota && "ml-auto")}
          >
            <CalendarClock className="h-4 w-4" /> Reprogramar
          </Button>
        )}
      </div>
    </li>
  );
}

export default function SesionesDeLaSemana({
  sesiones,
  onReprogramar,
}: {
  sesiones: SesionDelPaciente[];
  onReprogramar: (s: SesionDelPaciente) => void;
}) {
  const { lunes, domingo } = semanaActual();
  const vigentes = sesiones
    .filter((s) => s.estado?.nombre !== "Cancelada")
    .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
  const deLaSemana = vigentes.filter((s) => dia(s.fechaHoraInicio) >= lunes && dia(s.fechaHoraInicio) <= domingo);
  const despues = vigentes.filter((s) => dia(s.fechaHoraInicio) > domingo).slice(0, 4);
  const rango = (t: string) => t.slice(8, 10) + "/" + t.slice(5, 7);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-dorado">Esta semana</h2>
          <span className="text-sm text-tenue">del lunes {rango(lunes)} al domingo {rango(domingo)}</span>
        </div>
        {deLaSemana.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-borde-fuerte p-6 text-center text-suave">No tenés sesiones esta semana.</p>
        ) : (
          <ul className="space-y-3">
            {deLaSemana.map((s) => <TarjetaSesion key={s.id} s={s} onReprogramar={onReprogramar} />)}
          </ul>
        )}
      </section>

      {despues.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Tus próximas sesiones</h2>
          <ul className="space-y-3">
            {despues.map((s) => <TarjetaSesion key={s.id} s={s} onReprogramar={onReprogramar} compacta />)}
          </ul>
        </section>
      )}

      <p className="text-xs text-tenue">
        Podés reprogramar una sesión hasta 24 horas antes. Como máximo tenés 2 sesiones por semana, en días distintos.
      </p>
    </div>
  );
}
