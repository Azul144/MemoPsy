"use client"
// RF 4.3 - El psicólogo indica en qué días y horarios sus pacientes pueden reprogramar turnos.
// Cada fila es un horario (por ejemplo 09:00 a 13:00) con los días en que vale.
// En la base se guarda una franja por día; acá se agrupan los días que tienen el mismo horario.

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { avisoError, avisoExito } from "@/lib/avisos"

interface Franja {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

interface Bloque {
  dias: number[]
  horaInicio: string
  horaFin: string
}

interface Props {
  abierto: boolean
  onClose: () => void
}

// 1 = lunes ... 5 = viernes (el consultorio atiende de lunes a viernes)
const DIAS = [
  { numero: 1, corto: "Lun", nombre: "Lunes" },
  { numero: 2, corto: "Mar", nombre: "Martes" },
  { numero: 3, corto: "Mié", nombre: "Miércoles" },
  { numero: 4, corto: "Jue", nombre: "Jueves" },
  { numero: 5, corto: "Vie", nombre: "Viernes" },
]

const nuevoBloque = (): Bloque => ({ dias: [1, 2, 3, 4, 5], horaInicio: "09:00", horaFin: "13:00" })

// Franjas de la base → filas: junta los días que tienen exactamente el mismo horario
function agrupar(franjas: Franja[]): Bloque[] {
  const bloques: Bloque[] = []
  franjas.forEach((f) => {
    const igual = bloques.find((b) => b.horaInicio === f.horaInicio && b.horaFin === f.horaFin)
    if (igual) igual.dias = [...igual.dias, f.diaSemana].sort()
    else bloques.push({ dias: [f.diaSemana], horaInicio: f.horaInicio, horaFin: f.horaFin })
  })
  return bloques
}

export default function DialogoHorarios({ abierto, onClose }: Props) {
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Al abrir: trae los horarios que ya tiene cargados
  useEffect(() => {
    if (!abierto) return
    setErrores({})
    setCargando(true)
    fetch("/api/horarios-disponibles")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setBloques(agrupar(data.franjas ?? []))
      })
      .catch(() => avisoError("No se pudieron cargar tus horarios."))
      .finally(() => setCargando(false))
  }, [abierto])

  const cambiar = (i: number, cambios: Partial<Bloque>) => {
    setBloques((lista) => lista.map((b, j) => (j === i ? { ...b, ...cambios } : b)))
    setErrores((e) => ({ ...e, [i]: "" }))
  }

  const alternarDia = (i: number, dia: number) => {
    const dias = bloques[i].dias
    cambiar(i, { dias: dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia].sort() })
  }

  const quitar = (i: number) => {
    setBloques((lista) => lista.filter((_, j) => j !== i))
    setErrores({})
  }

  const guardar = async () => {
    // Antes de enviar: cada fila necesita al menos un día y un horario que termine después de empezar
    const errs: Record<number, string> = {}
    bloques.forEach((b, i) => {
      if (b.dias.length === 0) errs[i] = "Elegí al menos un día."
      else if (!b.horaInicio || !b.horaFin) errs[i] = "Completá el horario."
      else if (b.horaFin <= b.horaInicio) errs[i] = "La hora de fin debe ser posterior a la de inicio."
    })
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    // Una franja por día; se recuerda de qué fila salió cada una para marcar el error en la fila correcta
    const franjas: Franja[] = []
    const filaDeFranja: number[] = []
    bloques.forEach((b, i) =>
      b.dias.forEach((dia) => {
        franjas.push({ diaSemana: dia, horaInicio: b.horaInicio, horaFin: b.horaFin })
        filaDeFranja.push(i)
      }),
    )

    try {
      setGuardando(true)
      const res = await fetch("/api/horarios-disponibles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franjas }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errsServidor: Record<number, string> = {}
        if (Array.isArray(data.details)) {
          data.details.forEach((d: any) => {
            const fila = filaDeFranja[d.path?.[0]]
            if (fila === undefined) return
            const dia = DIAS.find((x) => x.numero === franjas[d.path[0]].diaSemana)?.nombre
            errsServidor[fila] = dia ? `${dia}: ${d.message}` : d.message
          })
        }
        setErrores(errsServidor)
        avisoError(data.error || "No se pudieron guardar los horarios.")
        return
      }
      avisoExito("Horarios guardados.")
      onClose()
    } catch (error) {
      console.error("Error guardando horarios:", error)
      avisoError("No se pudieron guardar los horarios. Verificá tu conexión.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onClose()}>
      <DialogContent
        className="p-4 sm:max-w-[520px] sm:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--dorado)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Horarios para reprogramar</DialogTitle>
          <DialogDescription className="text-suave">
            Elegí los días y el horario. Tus pacientes van a poder mover sus turnos solo a estos horarios, si están
            libres.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
          </div>
        ) : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {bloques.length === 0 && (
              <p className="rounded-lg border border-dashed border-borde-fuerte p-4 text-center text-sm text-suave">
                No habilitaste horarios. Mientras tanto, tus pacientes no pueden reprogramar por su cuenta.
              </p>
            )}
            {bloques.map((b, i) => (
              <div
                key={i}
                className={cn("space-y-3 rounded-xl border p-3", errores[i] ? "border-red-500/70" : "border-borde-fuerte")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días">
                    {DIAS.map((dia) => {
                      const activo = b.dias.includes(dia.numero)
                      return (
                        <button
                          key={dia.numero}
                          type="button"
                          onClick={() => alternarDia(i, dia.numero)}
                          aria-pressed={activo}
                          aria-label={dia.nombre}
                          className={cn(
                            "h-9 min-w-12 rounded-full border px-3 text-sm transition-colors",
                            activo
                              ? "border-dorado bg-primary font-semibold text-primary-foreground"
                              : "border-borde-fuerte text-suave hover:border-dorado/70",
                          )}
                        >
                          {dia.corto}
                        </button>
                      )
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => quitar(i)}
                    aria-label="Quitar horario"
                    className="shrink-0 text-peligro hover:bg-red-500/15 hover:text-peligro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label="Desde"
                    value={b.horaInicio}
                    onChange={(e) => cambiar(i, { horaInicio: e.target.value })}
                    className="flex-1 bg-background text-foreground border-borde-fuerte"
                  />
                  <span className="text-sm text-suave">a</span>
                  <Input
                    type="time"
                    aria-label="Hasta"
                    value={b.horaFin}
                    onChange={(e) => cambiar(i, { horaFin: e.target.value })}
                    className="flex-1 bg-background text-foreground border-borde-fuerte"
                  />
                </div>
                {errores[i] && <p className="text-xs text-peligro">{errores[i]}</p>}
              </div>
            ))}
            <Button variant="outline" onClick={() => setBloques([...bloques, nuevoBloque()])} className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Agregar horario
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || cargando} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
