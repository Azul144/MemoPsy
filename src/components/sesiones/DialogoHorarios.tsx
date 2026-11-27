"use client"
// RF 3.1 / RF 4.3 - El psicólogo marca en qué días atiende y en qué turno: mañana (8 a 11) o tarde (18 a 21).
// Los turnos nuevos, los cambios de horario y las reprogramaciones del paciente solo se dan dentro de ellos.
// En la base se guarda una fila por día y turno.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { avisoError, avisoExito } from "@/lib/avisos"
import { olvidarHorariosDeAtencion } from "@/components/sesiones/HorariosDeAtencion"
import { DIAS_ATENCION, TURNOS, turnoDeFranja, type FranjaAtencion } from "@/lib/sesiones/turnos-atencion"

interface Props {
  abierto: boolean
  onClose: () => void
}

// "1-manana", "3-tarde"...
const clave = (dia: number, turno: string) => `${dia}-${turno}`

export default function DialogoHorarios({ abierto, onClose }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [descartadas, setDescartadas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Al abrir: trae los turnos que ya tiene cargados
  useEffect(() => {
    if (!abierto) return
    setCargando(true)
    fetch("/api/horarios-disponibles")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const franjas: FranjaAtencion[] = data.franjas ?? []
        const validas = franjas.filter((f) => turnoDeFranja(f))
        setMarcados(new Set(validas.map((f) => clave(f.diaSemana, turnoDeFranja(f)!.clave))))
        // Horarios cargados antes de la regla de los dos turnos: se avisan y se descartan al guardar
        setDescartadas(franjas.length - validas.length)
      })
      .catch(() => avisoError("No se pudieron cargar tus horarios."))
      .finally(() => setCargando(false))
  }, [abierto])

  const alternar = (k: string) =>
    setMarcados((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(k)) nuevo.delete(k)
      else nuevo.add(k)
      return nuevo
    })

  const guardar = async () => {
    const franjas = DIAS_ATENCION.flatMap((d) =>
      TURNOS.filter((t) => marcados.has(clave(d.numero, t.clave))).map((t) => ({
        diaSemana: d.numero,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
      })),
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
        avisoError(data.error || "No se pudieron guardar los horarios.")
        return
      }
      olvidarHorariosDeAtencion()
      avisoExito("Horarios de atención guardados.")
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
        className="p-4 sm:max-w-[480px] sm:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--borde)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Días y horarios de atención</DialogTitle>
          <DialogDescription className="text-suave">
            Marcá en qué días atendés y en qué turno. Los turnos nuevos y los cambios de horario solo se pueden dar en
            estos horarios, si están libres.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2" role="group" aria-label="Días y turnos">
              <span />
              {TURNOS.map((t) => (
                <span key={t.clave} className="text-center text-xs text-suave">
                  <span className="block font-semibold text-foreground">{t.nombre}</span>
                  {t.texto}
                </span>
              ))}
              {DIAS_ATENCION.map((d) => (
                <div key={d.numero} className="contents">
                  <span className="pr-2 text-sm capitalize text-foreground">{d.nombre}</span>
                  {TURNOS.map((t) => {
                    const k = clave(d.numero, t.clave)
                    const activo = marcados.has(k)
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => alternar(k)}
                        aria-pressed={activo}
                        aria-label={`${d.nombre}, ${t.nombre.toLowerCase()} ${t.texto}`}
                        className={cn(
                          "h-10 rounded-full border text-sm transition-colors",
                          activo
                            ? "border-dorado bg-primary font-semibold text-primary-foreground"
                            : "border-borde-fuerte text-suave hover:border-dorado/70",
                        )}
                      >
                        {activo ? "Atiendo" : "—"}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            {marcados.size === 0 && (
              <p className="rounded-lg border border-dashed border-borde-fuerte p-3 text-center text-sm text-suave">
                Sin horarios marcados no se te pueden dar turnos nuevos ni mover los que tenés.
              </p>
            )}
            {descartadas > 0 && (
              <p className="text-xs text-naranja">
                Tenías horarios fuera de los turnos de 8 a 11 y de 18 a 21: al guardar, quedan solo los que marques acá.
              </p>
            )}
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
