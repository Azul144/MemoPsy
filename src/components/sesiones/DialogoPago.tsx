"use client"
// RF 3.5 - Registrar el pago de una sesión (efectivo, QR del psicólogo u obra social)

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { avisoError, avisoExito } from "@/lib/avisos"

export interface PagoSesion {
  estado: string
  medio: { id: string; descripcion: string } | null
  monto: number | null
  fecha: string | null
}

export interface MedioDePago {
  id: string
  descripcion: string
}

interface SesionParaPago {
  id: string
  fechaHoraInicio: string
  pago?: PagoSesion
  pacientes?: Array<{
    persona: { nombre: string; apellido: string }
    obraSocial?: { id: string; nombre: string } | null
  }>
}

interface Props {
  sesion: SesionParaPago | null
  mediosDePago: MedioDePago[]
  onClose: () => void
  onGuardado: (sesionId: string, pago: PagoSesion) => void
}

const esParticular = (nombre?: string) => !nombre || nombre.trim().toLowerCase() === "particular"

const claseItem =
  "text-texto-2 cursor-pointer hover:!bg-teal-700/60 hover:!text-aviso focus:!bg-teal-700/60 focus:!text-aviso data-[state=checked]:!text-aviso"

export default function DialogoPago({ sesion, mediosDePago, onClose, onGuardado }: Props) {
  const [estadoPago, setEstadoPago] = useState("Pendiente")
  const [medioId, setMedioId] = useState("")
  const [monto, setMonto] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  const paciente = sesion?.pacientes?.[0]
  const obraSocial = paciente?.obraSocial?.nombre
  const medioObraSocial = mediosDePago.find((m) => m.descripcion.toLowerCase() === "obra social")

  // Al abrir: carga lo que ya tenía, o sugiere el medio según la obra social del paciente
  useEffect(() => {
    if (!sesion) return
    const pago = sesion.pago
    setEstadoPago(pago?.estado ?? "Pendiente")
    setMonto(pago?.monto != null ? String(pago.monto) : "")
    setErrores({})
    if (pago?.medio) {
      setMedioId(String(pago.medio.id))
    } else if (!esParticular(obraSocial) && medioObraSocial) {
      setMedioId(String(medioObraSocial.id))
    } else {
      setMedioId("")
    }
  }, [sesion, obraSocial, medioObraSocial])

  const guardar = async () => {
    if (!sesion) return
    const nuevosErrores: Record<string, string> = {}
    if (estadoPago === "Pagado" && !medioId) nuevosErrores.medioDePagoId = "Indicá cómo se pagó la sesión"
    if (monto && Number(monto) < 0) nuevosErrores.monto = "El monto no puede ser negativo"
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    try {
      setGuardando(true)
      const res = await fetch(`/api/sesiones/${sesion.id}/pago`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estadoPago,
          medioDePagoId: estadoPago === "Pagado" ? Number(medioId) : null,
          monto: estadoPago === "Pagado" && monto ? Number(monto) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errs: Record<string, string> = {}
        if (Array.isArray(data.details)) {
          data.details.forEach((d: any) => d.path?.[0] && (errs[d.path[0]] = d.message))
        }
        setErrores(errs)
        avisoError(data.error || "No se pudo registrar el pago.")
        return
      }
      onGuardado(sesion.id, data.pago)
      avisoExito(estadoPago === "Pagado" ? "Pago registrado." : "La sesión quedó con pago pendiente.")
      onClose()
    } catch (error) {
      console.error("Error registrando pago:", error)
      avisoError("No se pudo registrar el pago. Verificá tu conexión.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={!!sesion} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent
        className="p-4 sm:max-w-[440px] sm:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--dorado)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Pago de la sesión</DialogTitle>
          <DialogDescription className="text-suave">
            {sesion && format(parseISO(sesion.fechaHoraInicio), "dd/MM/yyyy HH:mm")}
            {paciente && ` · ${paciente.persona.nombre} ${paciente.persona.apellido}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {paciente && (
            <p className="text-sm text-suave">
              Obra social:{" "}
              <span className="text-foreground">{esParticular(obraSocial) ? "Particular (sin obra social)" : obraSocial}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-suave">Estado del pago</Label>
            <Select value={estadoPago} onValueChange={setEstadoPago}>
              <SelectTrigger className="w-full bg-background text-foreground border-borde-fuerte">
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
                <SelectItem value="Pendiente" className={claseItem}>Pendiente</SelectItem>
                <SelectItem value="Pagado" className={claseItem}>Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {estadoPago === "Pagado" && (
            <>
              <div className="space-y-2">
                <Label className="text-suave">Medio de pago *</Label>
                <Select
                  value={medioId}
                  onValueChange={(v) => {
                    setMedioId(v)
                    setErrores((e) => ({ ...e, medioDePagoId: "" }))
                  }}
                >
                  <SelectTrigger
                    className={`w-full bg-background text-foreground border-borde-fuerte data-[placeholder]:text-tenue ${errores.medioDePagoId ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="¿Cómo pagó?" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
                    {mediosDePago.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)} className={claseItem}>
                        {m.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errores.medioDePagoId && <p className="text-xs text-peligro">{errores.medioDePagoId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto_pago" className="text-suave">Monto (opcional)</Label>
                <Input
                  id="monto_pago"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="$ 0,00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`bg-background text-foreground border-borde-fuerte ${errores.monto ? "border-red-500" : ""}`}
                />
                {errores.monto && <p className="text-xs text-peligro">{errores.monto}</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
