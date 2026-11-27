"use client"
// RF 3.1 - «Mi semana»: la agenda fija del psicólogo armada con los horarios pactados de cada paciente.
// Una columna por día (lunes a viernes) y, en cada una, la mañana y la tarde con el paciente de cada hora.
// Cada paciente lleva a su carpeta, donde se pacta o se cambia el horario.

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, Monitor, Users } from "lucide-react"
import { DIAS_ATENCION, TURNOS } from "@/lib/sesiones/turnos-atencion"
import { cn } from "@/lib/utils"

interface Pacto { id: number; pacienteId: number; paciente: string; diaSemana: number; horaInicio: string; modalidad: string }
interface SinPacto { id: string; nombre: string }

export default function MiSemana({ psicologoId, sinPactoCandidatos = [] }: { psicologoId: string; sinPactoCandidatos?: SinPacto[] }) {
  const [pactos, setPactos] = useState<Pacto[] | null>(null)

  useEffect(() => {
    fetch(`/api/pactos?psicologoId=${psicologoId}`)
      .then((r) => r.json())
      .then((d) => setPactos(d.pactos ?? []))
      .catch(() => setPactos([]))
  }, [psicologoId])

  const conPacto = new Set((pactos ?? []).map((p) => String(p.pacienteId)))
  const sinPacto = sinPactoCandidatos.filter((p) => !conPacto.has(String(p.id)))
  const pacientes = conPacto.size

  return (
    <section className="rounded-2xl border border-borde p-4 sm:p-5" style={{ backgroundColor: "var(--background)" }}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarClock className="h-5 w-5 text-dorado" aria-hidden="true" />
            Mi semana
          </p>
          <p className="mt-0.5 text-sm text-suave">
            {pactos === null
              ? "Cargando..."
              : `${pacientes} ${pacientes === 1 ? "paciente" : "pacientes"} con horario pactado. Los turnos de las próximas 4 semanas se crean solos.`}
          </p>
        </div>
        <Link href="/informes/carpetas" className="text-sm text-dorado hover:underline">Ver todas las carpetas</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {DIAS_ATENCION.map((dia) => {
          const delDia = (pactos ?? []).filter((p) => p.diaSemana === dia.numero)
          return (
            <div key={dia.numero} className="rounded-xl border border-foreground/10 bg-card">
              <p className="border-b border-foreground/10 px-3 py-2 text-sm font-semibold capitalize text-crema">{dia.nombre}</p>
              <div className="space-y-3 p-2">
                {TURNOS.map((turno) => {
                  const enTurno = delDia
                    .filter((p) => p.horaInicio >= turno.horaInicio && p.horaInicio < turno.horaFin)
                    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                  return (
                    <div key={turno.clave}>
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-tenue">{turno.nombre}</p>
                      {enTurno.length === 0 ? (
                        <p className="px-1 py-1 text-xs text-tenue/70">Libre</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {enTurno.map((p) => (
                            <li key={p.id}>
                              <Link
                                href={`/informes/carpetas/${p.pacienteId}`}
                                title="Abrir la carpeta del paciente"
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-primary/15",
                                  "border border-transparent hover:border-primary/40",
                                )}
                              >
                                <span className="font-semibold tabular-nums text-dorado">{p.horaInicio}</span>
                                <span className="min-w-0 flex-1 truncate text-foreground">{p.paciente}</span>
                                {p.modalidad === "Remota" && <Monitor className="h-3.5 w-3.5 shrink-0 text-info" aria-label="Remota" />}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {sinPacto.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-aviso/50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-aviso">
            <Users className="h-4 w-4" aria-hidden="true" />
            Con turnos pero sin horario pactado ({sinPacto.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sinPacto.map((p) => (
              <Link key={p.id} href={`/informes/carpetas/${p.id}`} className="rounded-full border border-borde px-3 py-1 text-sm text-foreground hover:border-dorado hover:text-dorado">
                {p.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
