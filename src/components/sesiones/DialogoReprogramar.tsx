"use client"
// RF 4.3 - El paciente elige un nuevo horario para su turno entre los que habilitó su psicólogo

import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { avisoError, avisoExito } from "@/lib/avisos"

interface SesionParaReprogramar {
  id: string
  fechaHoraInicio: string
  psicologo?: { persona: { nombre: string; apellido: string } } | null
}

interface HorarioLibre {
  inicio: string
  fin: string
}

interface Props {
  sesion: SesionParaReprogramar | null
  onClose: () => void
  onReprogramada: () => void
}

export default function DialogoReprogramar({ sesion, onClose, onReprogramada }: Props) {
  const [horarios, setHorarios] = useState<HorarioLibre[]>([])
  const [elegido, setElegido] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al abrir: busca los horarios libres para este turno
  useEffect(() => {
    if (!sesion) return
    setElegido(null)
    setHorarios([])
    setError(null)
    setCargando(true)
    fetch(`/api/sesiones/${sesion.id}/reprogramar`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "No se pudieron buscar horarios.")
          return
        }
        setHorarios(data.horarios ?? [])
      })
      .catch(() => setError("No se pudieron buscar horarios. Verificá tu conexión."))
      .finally(() => setCargando(false))
  }, [sesion])

  // Agrupados por día para mostrarlos como botones
  const porDia = useMemo(() => {
    const grupos = new Map<string, HorarioLibre[]>()
    horarios.forEach((h) => {
      const dia = format(parseISO(h.inicio), "yyyy-MM-dd")
      grupos.set(dia, [...(grupos.get(dia) ?? []), h])
    })
    return [...grupos.entries()]
  }, [horarios])

  const confirmar = async () => {
    if (!sesion || !elegido) return
    try {
      setGuardando(true)
      const res = await fetch(`/api/sesiones/${sesion.id}/reprogramar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaHoraInicio: elegido }),
      })
      const data = await res.json()
      if (!res.ok) {
        avisoError(data.error || "No se pudo reprogramar el turno.")
        return
      }
      avisoExito(`Turno reprogramado para el ${format(parseISO(elegido), "EEEE d/MM 'a las' HH:mm", { locale: es })}.`)
      onReprogramada()
      onClose()
    } catch (error) {
      console.error("Error reprogramando turno:", error)
      avisoError("No se pudo reprogramar el turno. Verificá tu conexión.")
    } finally {
      setGuardando(false)
    }
  }

  const psicologo = sesion?.psicologo?.persona

  return (
    <Dialog open={!!sesion} onOpenChange={(a) => !a && onClose()}>
      <DialogContent
        className="p-4 sm:max-w-[520px] sm:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--dorado)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Reprogramar turno</DialogTitle>
          <DialogDescription className="text-suave">
            {sesion && `Turno actual: ${format(parseISO(sesion.fechaHoraInicio), "EEEE d/MM 'a las' HH:mm", { locale: es })}`}
            {psicologo && ` · ${psicologo.nombre} ${psicologo.apellido}`}
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-500/40 p-4 text-center text-sm text-peligro">{error}</p>
        ) : porDia.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borde-fuerte p-4 text-center text-sm text-suave">
            Tu psicólogo no tiene horarios libres habilitados en las próximas semanas. Comunicate con el consultorio
            para reprogramar.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {porDia.map(([dia, lista]) => (
              <div key={dia}>
                <p className="mb-2 text-sm font-semibold capitalize text-foreground">
                  {format(parseISO(lista[0].inicio), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lista.map((h) => (
                    <button
                      key={h.inicio}
                      type="button"
                      onClick={() => setElegido(h.inicio)}
                      aria-pressed={elegido === h.inicio}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        elegido === h.inicio
                          ? "border-dorado bg-primary font-semibold text-primary-foreground"
                          : "border-borde-fuerte text-texto-2 hover:border-dorado/70",
                      )}
                    >
                      {format(parseISO(h.inicio), "HH:mm")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!elegido || guardando} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reprogramar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
