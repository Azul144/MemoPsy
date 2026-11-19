"use client"
// RF 3.1 - En el formulario del turno: muestra cuándo atiende el psicólogo elegido y ofrece las horas
// de inicio libres del día (dentro de sus turnos de mañana, de 8 a 11, o de tarde, de 18 a 21).
// Elegir una hora completa el inicio y el fin con la duración que ya tenía el turno.
// El servidor vuelve a validar todo: esto solo ayuda a elegir bien.

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { horasDeInicio, resumenAtencion, validarEnAtencion, MENSAJE_SIN_HORARIOS, type FranjaAtencion } from "@/lib/sesiones/turnos-atencion"

// Se comparten entre los dos formularios (nuevo turno y edición) para no pedirlas dos veces
const cache = new Map<string, FranjaAtencion[]>()

// Después de que el psicólogo cambia sus horarios, se vuelven a pedir
export function olvidarHorariosDeAtencion() {
  cache.clear()
}

interface Props {
  psicologoId: string
  fecha: string // "yyyy-MM-dd"
  horaInicio: string // "HH:mm"
  horaFin: string
  // Turnos que ya ocupan al psicólogo ese día (sin contar el que se está editando)
  ocupados: { inicio: string; fin: string }[] // "HH:mm"
  onElegir: (horaInicio: string, horaFin: string) => void
}

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const texto = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

export default function HorariosDeAtencion({ psicologoId, fecha, horaInicio, horaFin, ocupados, onElegir }: Props) {
  const [franjas, setFranjas] = useState<FranjaAtencion[] | null>(psicologoId ? cache.get(psicologoId) ?? null : null)

  useEffect(() => {
    if (!psicologoId) return setFranjas(null)
    if (cache.has(psicologoId)) return setFranjas(cache.get(psicologoId)!)
    let vigente = true
    fetch(`/api/horarios-disponibles?psicologoId=${encodeURIComponent(psicologoId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!vigente || !data) return
        cache.set(psicologoId, data.franjas ?? [])
        setFranjas(data.franjas ?? [])
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [psicologoId])

  if (!psicologoId || franjas === null) return null
  if (franjas.length === 0) return <p className="text-sm text-naranja">{MENSAJE_SIN_HORARIOS}</p>

  const [anio, mes, dia] = fecha.split("-").map(Number)
  const diaSemana = fecha ? ((new Date(anio, mes - 1, dia).getDay() + 6) % 7) + 1 : 0
  const duracion = horaInicio && horaFin && minutos(horaFin) > minutos(horaInicio) ? minutos(horaFin) - minutos(horaInicio) : 60
  const horas = horasDeInicio(franjas, diaSemana, duracion)
  const fuera = horaInicio && horaFin ? validarEnAtencion(franjas, diaSemana, horaInicio, horaFin) : null

  return (
    <div className="space-y-2 rounded-lg border border-borde-fuerte p-3">
      <p className="text-sm text-suave">
        <span className="font-semibold text-foreground">Atiende:</span> {resumenAtencion(franjas)}.
      </p>
      {horas.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Horas de inicio disponibles">
          {horas.map((h) => {
            const fin = texto(minutos(h) + duracion)
            const ocupado = ocupados.some((o) => minutos(o.inicio) < minutos(fin) && minutos(o.fin) > minutos(h))
            const elegido = h === horaInicio
            return (
              <button
                key={h}
                type="button"
                disabled={ocupado}
                onClick={() => onElegir(h, fin)}
                aria-pressed={elegido}
                title={ocupado ? "Ocupado" : `${h} a ${fin}`}
                className={cn(
                  "h-8 rounded-full border px-3 text-sm transition-colors",
                  elegido
                    ? "border-dorado bg-primary font-semibold text-primary-foreground"
                    : "border-borde-fuerte text-foreground hover:border-dorado/70",
                  ocupado && "cursor-not-allowed line-through opacity-40 hover:border-borde-fuerte",
                )}
              >
                {h}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-naranja">Ese día no atiende. Elegí otra fecha.</p>
      )}
      {fuera && horas.length > 0 && <p className="text-sm text-peligro">{fuera}</p>}
    </div>
  )
}
