"use client"
// RF 2.4 - Debajo de la nota clínica, el psicólogo arma el informe de seguimiento para el paciente
// (plantilla con espacios para completar) y ve lo que el paciente respondió de cada actividad.

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Download,
  Edit,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { avisoError, avisoExito, confirmar } from "@/lib/avisos"
import { descargarPdfSeguimiento, type Seguimiento } from "./tipos-seguimiento"

interface Props {
  informeId: string
  tienePacientes: boolean
}

interface ActividadForm {
  id?: string
  descripcion: string
}

interface Formulario {
  resumen: string
  actividades: ActividadForm[]
  pautas: string
  avances: string
}

const vacio: Formulario = { resumen: "", actividades: [{ descripcion: "" }], pautas: "", avances: "" }

const fechaLarga = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM, HH:mm", { locale: es })

export default function SeccionSeguimiento({ informeId, tienePacientes }: Props) {
  const [seguimiento, setSeguimiento] = useState<Seguimiento | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Formulario>(vacio)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    setCargando(true)
    fetch(`/api/informes/${informeId}/seguimiento`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSeguimiento(data.seguimiento)
      })
      .catch(() => avisoError("No se pudo cargar el informe de seguimiento."))
      .finally(() => setCargando(false))
  }, [informeId])

  const empezarEdicion = () => {
    setForm(
      seguimiento
        ? {
            resumen: seguimiento.resumen,
            actividades: seguimiento.actividades.length
              ? seguimiento.actividades.map((a) => ({ id: a.id, descripcion: a.descripcion }))
              : [{ descripcion: "" }],
            pautas: seguimiento.pautas ?? "",
            avances: seguimiento.avances ?? "",
          }
        : vacio,
    )
    setErrores({})
    setEditando(true)
  }

  const cambiarActividad = (i: number, descripcion: string) => {
    setForm((f) => ({ ...f, actividades: f.actividades.map((a, j) => (j === i ? { ...a, descripcion } : a)) }))
    setErrores((e) => ({ ...e, [`actividad-${i}`]: "" }))
  }

  const guardar = async () => {
    const errs: Record<string, string> = {}
    if (!form.resumen.trim()) errs.resumen = "Contale al paciente qué trabajaron en la sesión."
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    // Las filas de actividad que quedaron vacías no se envían
    const actividades = form.actividades
      .map((a) => ({ ...a, descripcion: a.descripcion.trim() }))
      .filter((a) => a.descripcion)

    // Si cambia el texto de una actividad que el paciente ya respondió, su respuesta se borra
    const respondidasQueCambian = actividades.filter((a) => {
      const anterior = seguimiento?.actividades.find((x) => x.id === a.id)
      return anterior?.respuesta && anterior.descripcion !== a.descripcion
    })
    if (
      respondidasQueCambian.length > 0 &&
      !(await confirmar(
        "Cambiaste el texto de una actividad que el paciente ya respondió. Su respuesta se va a borrar para que la vuelva a contestar. ¿Continuar?",
      ))
    ) {
      return
    }

    try {
      setGuardando(true)
      const res = await fetch(`/api/informes/${informeId}/seguimiento`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen: form.resumen,
          pautas: form.pautas,
          avances: form.avances,
          actividades,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        avisoError(data.error || "No se pudo guardar el informe de seguimiento.")
        return
      }
      avisoExito(seguimiento ? "Informe actualizado. Le avisamos al paciente." : "Informe compartido con el paciente.")
      setSeguimiento(data.seguimiento)
      setEditando(false)
    } catch {
      avisoError("No se pudo guardar el informe. Verificá tu conexión.")
    } finally {
      setGuardando(false)
    }
  }

  const descargar = async () => {
    if (!seguimiento) return
    setDescargando(true)
    const error = await descargarPdfSeguimiento(seguimiento.id)
    if (error) avisoError(error)
    setDescargando(false)
  }

  const respondidas = seguimiento?.actividades.filter((a) => a.respuesta).length ?? 0

  return (
    <Card className="mx-auto mt-6 max-w-3xl shadow-lg" style={{ backgroundColor: "#1D3434", borderColor: "#2A4A4A" }}>
      <CardHeader className="border-b border-gray-700 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1C77A]/15">
              <ClipboardCheck className="h-6 w-6 text-[#F1C77A]" />
            </span>
            <div>
              <CardTitle className="text-xl text-white">Informe de seguimiento para el paciente</CardTitle>
              <CardDescription className="mt-1 text-gray-300">
                Es lo único que ve el paciente. La nota clínica de arriba sigue siendo privada.
              </CardDescription>
            </div>
          </div>
          {seguimiento && !editando && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={descargar}
                disabled={descargando}
                className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A]/10"
              >
                {descargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                PDF del paciente
              </Button>
              <Button onClick={empezarEdicion} className="bg-[#F1C77A] text-[#1D3434] hover:bg-[#F1C77A]/80">
                <Edit className="mr-2 h-4 w-4" /> Editar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {cargando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[#F1C77A]" />
          </div>
        ) : editando ? (
          // ---------- Plantilla para completar ----------
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="seg-resumen" className="text-gray-200">
                Lo que trabajamos en la sesión *
              </Label>
              <p className="text-xs text-gray-400">En palabras simples, sin términos técnicos. El paciente lo va a leer.</p>
              <Textarea
                id="seg-resumen"
                rows={4}
                value={form.resumen}
                onChange={(e) => {
                  setForm({ ...form, resumen: e.target.value })
                  setErrores((er) => ({ ...er, resumen: "" }))
                }}
                placeholder="Ej: Hablamos de las situaciones que te generan ansiedad en el trabajo y practicamos una técnica de respiración."
                className={cn("border-gray-600 bg-[#152A2A] text-white focus:border-[#F1C77A]", errores.resumen && "border-red-500")}
              />
              {errores.resumen && <p className="text-xs text-red-400">{errores.resumen}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Actividades hasta la próxima sesión</Label>
              <p className="text-xs text-gray-400">
                Una por renglón. El paciente va a poder marcar si la hizo y dejarte un comentario.
              </p>
              {form.actividades.map((a, i) => (
                <div key={a.id ?? `nueva-${i}`} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-sm font-semibold text-[#F1C77A]">{i + 1}.</span>
                  <Input
                    value={a.descripcion}
                    onChange={(e) => cambiarActividad(i, e.target.value)}
                    maxLength={500}
                    aria-label={`Actividad ${i + 1}`}
                    placeholder={i === 0 ? "Ej: Practicar la respiración 4-7-8 antes de dormir" : "Otra actividad"}
                    className="border-gray-600 bg-[#152A2A] text-white focus:border-[#F1C77A]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar actividad"
                    onClick={() => setForm((f) => ({ ...f, actividades: f.actividades.filter((_, j) => j !== i) }))}
                    className="shrink-0 text-red-300 hover:bg-red-500/15 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.actividades.length < 20 && (
                <Button
                  variant="outline"
                  onClick={() => setForm((f) => ({ ...f, actividades: [...f.actividades, { descripcion: "" }] }))}
                  className="w-full border-dashed"
                >
                  <Plus className="mr-2 h-4 w-4" /> Agregar actividad
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seg-pautas" className="text-gray-200">
                Pautas y recomendaciones
              </Label>
              <Textarea
                id="seg-pautas"
                rows={3}
                value={form.pautas}
                onChange={(e) => setForm({ ...form, pautas: e.target.value })}
                placeholder="Ej: Si la ansiedad aparece de noche, evitá el celular la última hora antes de dormir."
                className="border-gray-600 bg-[#152A2A] text-white focus:border-[#F1C77A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seg-avances" className="text-gray-200">
                Avances y logros
              </Label>
              <p className="text-xs text-gray-400">Opcional. Una devolución para reconocer lo que el paciente viene logrando.</p>
              <Textarea
                id="seg-avances"
                rows={3}
                value={form.avances}
                onChange={(e) => setForm({ ...form, avances: e.target.value })}
                placeholder="Ej: Pudiste identificar qué situaciones te disparan la ansiedad, y eso es un gran paso."
                className="border-gray-600 bg-[#152A2A] text-white focus:border-[#F1C77A]"
              />
            </div>

            <p className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarClock className="h-4 w-4 text-[#F1C77A]" />
              La próxima sesión se completa sola con el próximo turno de la agenda.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditando(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando} style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}>
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {seguimiento ? "Guardar cambios" : "Compartir con el paciente"}
              </Button>
            </div>
          </div>
        ) : !seguimiento ? (
          // ---------- Todavía no hay informe ----------
          <div className="space-y-4 text-center">
            <p className="text-gray-300">
              Armá un resumen simple de la sesión, las actividades para la semana y tus pautas. Cuando lo guardes, al
              paciente le llega un aviso y lo puede descargar en PDF.
            </p>
            {tienePacientes ? (
              <Button onClick={empezarEdicion} style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}>
                <ClipboardCheck className="mr-2 h-4 w-4" /> Generar informe de seguimiento
              </Button>
            ) : (
              <p className="text-sm text-amber-300">Asociá al menos un paciente a la nota para poder compartirle un informe.</p>
            )}
          </div>
        ) : (
          // ---------- Informe compartido + respuestas del paciente ----------
          <>
            <p className="text-xs text-gray-400">
              Compartido el {fechaLarga(seguimiento.fechaCreacion)}
              {seguimiento.fechaActualizacion !== seguimiento.fechaCreacion &&
                ` · actualizado el ${fechaLarga(seguimiento.fechaActualizacion)}`}
            </p>

            <Bloque titulo="Lo que trabajamos en la sesión" texto={seguimiento.resumen} />

            {seguimiento.actividades.length > 0 && (
              <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-white">Actividades hasta la próxima sesión</h3>
                  <span className="text-xs text-gray-400">
                    {respondidas} de {seguimiento.actividades.length} respondidas por el paciente
                  </span>
                </div>
                <ul className="space-y-2">
                  {seguimiento.actividades.map((a) => (
                    <li key={a.id} className="rounded-lg border border-gray-700 bg-[#152A2A] p-3">
                      <div className="flex items-start gap-3">
                        {a.respuesta === "HECHA" ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-label="La hizo" />
                        ) : a.respuesta === "NO_PUDE" ? (
                          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" aria-label="No pudo" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-label="Sin responder" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-200">{a.descripcion}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {a.respuesta === "HECHA"
                              ? "La hizo"
                              : a.respuesta === "NO_PUDE"
                                ? "No pudo hacerla"
                                : "Todavía sin responder"}
                            {a.fechaRespuesta && ` · ${fechaLarga(a.fechaRespuesta)}`}
                          </p>
                          {a.comentario && (
                            <p className="mt-2 flex items-start gap-2 rounded-md bg-white/5 p-2 text-sm text-gray-200">
                              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#F1C77A]" />
                              {a.comentario}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {seguimiento.pautas && <Bloque titulo="Pautas y recomendaciones" texto={seguimiento.pautas} />}
            {seguimiento.avances && <Bloque titulo="Avances y logros" texto={seguimiento.avances} />}

            <p className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarClock className="h-4 w-4 text-[#F1C77A]" />
              Próxima sesión: {seguimiento.proximaSesion ? fechaLarga(seguimiento.proximaSesion) : "a coordinar"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-white">{titulo}</h3>
      <p className="whitespace-pre-wrap rounded-lg border border-gray-700 bg-[#152A2A] p-3 text-gray-300">{texto}</p>
    </div>
  )
}
