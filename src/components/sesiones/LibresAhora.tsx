"use client"
// RF 3.1 - «Libres ahora», para la recepción: alguien llega al consultorio y quiere atenderse ya.
// Para la hora en punto que sigue y la siguiente, muestra cada psicólogo que atiende en ese turno:
//  - libre → «Dar turno» abre «Nuevo turno» con el psicólogo, el día y la hora cargados;
//  - ocupado → con qué paciente, y botones para DERIVAR a un psicólogo libre a esa hora.
// Si nadie está libre en esas dos horas, muestra el próximo horario libre de cada psicólogo.
// Lee las mismas sesiones que ya cargó la pantalla y las franjas de atención de cada psicólogo.

import { useEffect, useMemo, useState } from "react"
import { ArrowRightLeft, Clock, Loader2, UserCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
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

type Estado =
  | { tipo: "no-atiende" }
  | { tipo: "libre" }
  | { tipo: "ocupado"; paciente: string }

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

  const datos = useMemo(() => {
    if (!franjas) return null
    const activas = sesiones.filter((s) => s.estado?.nombre !== "Cancelada")

    const estadoEn = (psicologoId: string, dia: string, diaSemana: number, m: number): Estado => {
      const atiende = (franjas[psicologoId] ?? []).some(
        (f) => f.diaSemana === diaSemana && aMin(f.horaInicio) <= m && m + DURACION <= aMin(f.horaFin),
      )
      if (!atiende) return { tipo: "no-atiende" }
      const inicio = enFecha(dia, m)
      const fin = enFecha(dia, m + DURACION)
      const turno = activas.find(
        (s) => String(s.psicologo?.id ?? "") === psicologoId && new Date(s.fechaHoraInicio) < fin && new Date(s.fechaHoraFin) > inicio,
      )
      if (!turno) return { tipo: "libre" }
      const persona = turno.pacientes?.[0]?.persona
      return { tipo: "ocupado", paciente: persona ? `${persona.nombre} ${persona.apellido}` : "otro paciente" }
    }

    // La hora en punto que sigue (si recién empezó la hora, hasta 10 minutos, se ofrece esa misma)
    const dia = diaTexto(ahora)
    const diaSemana = diaSemanaDe(ahora)
    const minutos = ahora.getHours() * 60 + ahora.getMinutes()
    const primera = minutos % 60 <= 10 ? minutos - (minutos % 60) : minutos - (minutos % 60) + 60
    const horas = [primera, primera + 60].map((m) => ({
      m,
      filas: psicologos
        .map((p) => ({ psicologo: p, estado: estadoEn(p.id, dia, diaSemana, m) }))
        .filter((f) => f.estado.tipo !== "no-atiende"),
    }))

    // Próximo horario libre de cada psicólogo, en los próximos 7 días
    const proximos = psicologos
      .map((p) => {
        for (let d = 0; d < 7; d++) {
          const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + d)
          const ds = diaSemanaDe(fecha)
          const delDia = (franjas[p.id] ?? []).filter((f) => f.diaSemana === ds).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
          for (const f of delDia) {
            for (let m = aMin(f.horaInicio); m + DURACION <= aMin(f.horaFin); m += 60) {
              if (enFecha(diaTexto(fecha), m).getTime() <= ahora.getTime()) continue
              if (estadoEn(p.id, diaTexto(fecha), ds, m).tipo === "libre") return { psicologo: p, fecha, m }
            }
          }
        }
        return null
      })
      .filter((x): x is { psicologo: PsicologoDeAgenda; fecha: Date; m: number } => x !== null)
      .sort((a, b) => enFecha(diaTexto(a.fecha), a.m).getTime() - enFecha(diaTexto(b.fecha), b.m).getTime())

    return { dia, horas, proximos }
  }, [franjas, sesiones, psicologos, ahora])

  const elegir = (psicologo: PsicologoDeAgenda, dia: string, m: number) =>
    onElegir({ fecha: dia, horaInicio: aHora(m), horaFin: aHora(m + DURACION), psicologo })

  const nombre = (p: PsicologoDeAgenda) => `${p.persona.nombre} ${p.persona.apellido}`

  return (
    <div className="mb-4 rounded-md border border-dorado/40 p-3" style={{ backgroundColor: "var(--background)" }}>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Zap className="h-4 w-4 text-dorado" aria-hidden="true" />
        Libres ahora
      </p>
      <p className="mt-0.5 text-xs text-tenue">
        Si llega alguien que quiere atenderse ya: dale turno con un psicólogo libre, o derivalo si el suyo está ocupado.
      </p>

      {!datos ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-tenue"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mirando las agendas…</p>
      ) : (
        <div className="mt-3 space-y-3">
          {datos.horas.map(({ m, filas }, i) => {
            const libres = filas.filter((f) => f.estado.tipo === "libre")
            return (
              <div key={m}>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-suave">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {i === 0 ? "Próximo turno" : "La hora siguiente"} · {aHora(m)}
                </p>
                {filas.length === 0 ? (
                  <p className="mt-1 text-xs text-tenue">Ningún psicólogo atiende a esta hora.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {filas.map(({ psicologo, estado }) => (
                      <li key={psicologo.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-card px-2.5 py-2 text-sm">
                        <span className="min-w-0 flex-1 font-medium text-foreground">{nombre(psicologo)}</span>
                        {estado.tipo === "libre" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => elegir(psicologo, datos.dia, m)}
                            className="h-8 rounded-full bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                          >
                            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Dar turno {aHora(m)}
                          </Button>
                        ) : (
                          <>
                            <span className="text-xs text-suave">Ocupado con {estado.tipo === "ocupado" ? estado.paciente : ""}</span>
                            {libres.length > 0 && (
                              <span className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                                <span className="flex items-center gap-1 text-xs text-dorado">
                                  <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" /> Derivar a
                                </span>
                                {libres.map((l) => (
                                  <Button
                                    key={l.psicologo.id}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => elegir(l.psicologo, datos.dia, m)}
                                    title={`Dar el turno de las ${aHora(m)} con ${nombre(l.psicologo)}`}
                                    className="h-7 rounded-full border-dorado/60 px-2.5 text-xs text-dorado hover:bg-primary hover:text-primary-foreground"
                                  >
                                    {l.psicologo.persona.nombre} {l.psicologo.persona.apellido}
                                  </Button>
                                ))}
                              </span>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}

          {datos.horas.every((h) => !h.filas.some((f) => f.estado.tipo === "libre")) && datos.proximos.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-suave">Próximo horario libre de cada uno</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {datos.proximos.map(({ psicologo, fecha, m }) => (
                  <li key={psicologo.id}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => elegir(psicologo, diaTexto(fecha), m)}
                      className="h-8 rounded-full border-borde-fuerte px-3 text-xs text-foreground hover:border-dorado hover:text-dorado"
                    >
                      {psicologo.persona.nombre} {psicologo.persona.apellido} · {diaTexto(fecha) === datos.dia ? "hoy" : DIAS[diaSemanaDe(fecha)]} {aHora(m)}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
