"use client"
// RF 3.1 - Lo que ve el paciente: el día y la hora que acordó con su psicólogo/a.
import { useEffect, useState } from "react"
import { CalendarClock } from "lucide-react"
import { DIAS_ATENCION } from "@/lib/sesiones/turnos-atencion"

interface Pacto { id: number; psicologo: string; diaSemana: number; horaInicio: string; modalidad: string }

const nombreDia = (n: number) => DIAS_ATENCION.find((d) => d.numero === n)?.nombre ?? ""

export default function PactoDelPaciente() {
  const [pactos, setPactos] = useState<Pacto[]>([])

  useEffect(() => {
    fetch("/api/pactos")
      .then((r) => r.json())
      .then((d) => setPactos(d.pactos ?? []))
      .catch(() => setPactos([]))
  }, [])

  if (pactos.length === 0) return null
  // Agrupado por psicólogo (casi siempre uno solo)
  const porPsicologo = [...new Set(pactos.map((p) => p.psicologo))]

  return (
    <section className="mb-6 flex flex-wrap items-start gap-4 rounded-2xl border border-dorado/40 bg-card p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-dorado">
        <CalendarClock className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-crema">Tu horario de sesiones</p>
        {porPsicologo.map((psicologo) => (
          <div key={psicologo} className="mt-2">
            <p className="text-sm text-suave">Con {psicologo}, todas las semanas:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {pactos
                .filter((p) => p.psicologo === psicologo)
                .map((p) => (
                  <li key={p.id} className="rounded-full border border-borde bg-superficie/40 px-4 py-1.5 text-sm">
                    <span className="font-semibold capitalize text-crema">{nombreDia(p.diaSemana)} {p.horaInicio}</span>
                    <span className="text-suave"> · {p.modalidad === "Remota" ? "por videollamada" : "en el consultorio"}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <p className="mt-3 text-xs text-tenue">Si una semana no podés, reprogramá esa sesión desde abajo: tu horario fijo no cambia.</p>
      </div>
    </section>
  )
}
