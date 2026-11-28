"use client"
// RF 3.1 - «Atender ahora», para la recepción: alguien llega al consultorio y quiere atenderse ya.
// Una tarjeta por psicólogo: si está libre, ocupado (y con quién) o fuera de su horario, y su
// próximo horario libre con el botón para dar el turno. Para DERIVAR, la recepción elige la tarjeta
// de otro psicólogo libre a esa hora.
// Lee las mismas sesiones que ya cargó la pantalla y las franjas de atención de cada psicólogo.

import { useEffect, useMemo, useState } from "react"
import { Loader2, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HorarioElegido, PsicologoDeAgenda } from "./AgendaDelPsicologo"

interface Franja { diaSemana: number; horaInicio: string; horaFin: string }
interface SesionAgenda {
  fechaHoraInicio: string
  fechaHoraFin: string
  psicologo?: { id: string } | null
  estado?: { nombre: string } | null
  pacientes?: { persona?: { nombre: string; apellido: string } | null }[] | null
}

const DURACION = 50
const dos = (n: number) => String(n).padStart(2, "0")
const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const aHora = (m: number) => `${dos(Math.floor(m / 60))}:${dos(m % 60)}`
// La recepción está en la misma zona horaria que el consultorio: se usan las horas locales
const diaTexto = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
const diaSemanaDe = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay())
const enFecha = (dia: string, m: number) => new Date(`${dia}T${aHora(m)}:00`)
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

interface Tarjeta {
  psicologo: PsicologoDeAgenda
  ahora: { tipo: "libre" | "fuera" } | { tipo: "ocupado"; paciente: string; hasta: string }
  proximo: { dia: string; texto: string; m: number } | null
}

export default function LibresAhora({
  psicologos,
  sesiones,
  onElegir,
}: {
  psicologos: PsicologoDeAgenda[]
  sesiones: SesionAgenda[]
  onElegir: (h: HorarioElegido) => void
}) {
  const [franjas, setFranjas] = useState<Record<string, Franja[]> | null>(null)
  const [ahora, setAhora] = useState(() => new Date())

  // Se actualiza cada minuto, así «ahora» no queda viejo con la pantalla abierta
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (psicologos.length === 0) return
    Promise.all(
      psicologos.map((p) =>
        fetch(`/api/horarios-disponibles?psicologoId=${p.id}`)
          .then((r) => (r.ok ? r.json() : { franjas: [] }))
          .then((d) => [p.id, (d.franjas ?? []) as Franja[]] as const)
          .catch(() => [p.id, [] as Franja[]] as const),
      ),
    ).then((pares) => setFranjas(Object.fromEntries(pares)))
  }, [psicologos])

  const tarjetas = useMemo<Tarjeta[] | null>(() => {
    if (!franjas) return null
    const activas = sesiones.filter((s) => s.estado?.nombre !== "Cancelada")
    const hoy = diaTexto(ahora)
    const minutos = ahora.getHours() * 60 + ahora.getMinutes()

    const atiende = (id: string, ds: number, m: number) =>
      (franjas[id] ?? []).some((f) => f.diaSemana === ds && aMin(f.horaInicio) <= m && m + DURACION <= aMin(f.horaFin))
    const turnoEn = (id: string, inicio: Date, fin: Date) =>
      activas.find((s) => String(s.psicologo?.id ?? "") === id && new Date(s.fechaHoraInicio) < fin && new Date(s.fechaHoraFin) > inicio)

    return psicologos
      .map((p): Tarjeta => {
        // Ahora mismo
        const enCurso = turnoEn(p.id, ahora, new Date(ahora.getTime() + 60 * 1000))
        const persona = enCurso?.pacientes?.[0]?.persona
        const estadoAhora: Tarjeta["ahora"] = enCurso
          ? {
              tipo: "ocupado",
              paciente: persona ? `${persona.nombre} ${persona.apellido}` : "otro paciente",
              hasta: aHora(new Date(enCurso.fechaHoraFin).getHours() * 60 + new Date(enCurso.fechaHoraFin).getMinutes()),
            }
          : atiende(p.id, diaSemanaDe(ahora), minutos - (minutos % 60))
            ? { tipo: "libre" }
            : { tipo: "fuera" }

        // Próximo horario libre (hora en punto; si la hora recién empezó, hasta 10 minutos, vale esa)
        let proximo: Tarjeta["proximo"] = null
        for (let d = 0; d < 7 && !proximo; d++) {
          const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + d)
          const ds = diaSemanaDe(fecha)
          const dia = diaTexto(fecha)
          const delDia = (franjas[p.id] ?? []).filter((f) => f.diaSemana === ds).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
          for (const f of delDia) {
            for (let m = aMin(f.horaInicio); m + DURACION <= aMin(f.horaFin) && !proximo; m += 60) {
              if (dia === hoy && m + 10 < minutos) continue
              if (turnoEn(p.id, enFecha(dia, m), enFecha(dia, m + DURACION))) continue
              const cuando = dia === hoy ? "hoy" : d === 1 ? "mañana" : DIAS[ds]
              proximo = { dia, texto: `${cuando} ${aHora(m)}`, m }
            }
          }
        }
        return { psicologo: p, ahora: estadoAhora, proximo }
      })
      // Primero los que se pueden atender antes
      .sort((a, b) => {
        const t = (x: Tarjeta) => (x.proximo ? enFecha(x.proximo.dia, x.proximo.m).getTime() : Infinity)
        return t(a) - t(b)
      })
  }, [franjas, sesiones, psicologos, ahora])

  const nombre = (p: PsicologoDeAgenda) => `${p.persona.nombre} ${p.persona.apellido}`

  return (
    <div className="space-y-3">
      <p className="text-sm text-suave">
        Si llega alguien que quiere atenderse ya, dale el turno con el primero que esté libre. Si el psicólogo que pide está
        ocupado, elegí otro: queda derivado.
      </p>

      {!tarjetas ? (
        <p className="flex items-center gap-2 text-sm text-tenue"><Loader2 className="h-4 w-4 animate-spin" /> Mirando las agendas…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map(({ psicologo, ahora: estado, proximo }) => (
            <li key={psicologo.id} className="flex flex-col rounded-2xl border border-foreground/10 bg-card p-4">
              <p className="font-semibold text-foreground">{nombre(psicologo)}</p>
              <p
                className={cn(
                  "mt-1 flex items-center gap-2 text-sm",
                  estado.tipo === "libre" ? "text-exito" : estado.tipo === "ocupado" ? "text-aviso" : "text-tenue",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    estado.tipo === "libre" ? "bg-emerald-500" : estado.tipo === "ocupado" ? "bg-amber-500" : "bg-foreground/30",
                  )}
                  aria-hidden="true"
                />
                {estado.tipo === "libre"
                  ? "Libre ahora"
                  : estado.tipo === "ocupado"
                    ? `Con ${estado.paciente} hasta las ${estado.hasta}`
                    : "Fuera de su horario"}
              </p>
              <div className="mt-auto pt-4">
                {proximo ? (
                  <button
                    type="button"
                    onClick={() => onElegir({ fecha: proximo.dia, horaInicio: aHora(proximo.m), horaFin: aHora(proximo.m + DURACION), psicologo })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                    Dar turno {proximo.texto}
                  </button>
                ) : (
                  <p className="text-sm text-tenue">Sin horarios libres esta semana.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
