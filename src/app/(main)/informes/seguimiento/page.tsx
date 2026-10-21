// src/app/(main)/informes/seguimiento/page.tsx
// RF 2.4 / RF 2.5 - Panel del paciente: sus informes de seguimiento.
// Lee lo que trabajó en cada sesión, marca si pudo hacer cada actividad (con un comentario
// para su psicólogo/a) y descarga el informe en PDF. Nunca ve la nota clínica.
"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarClock, Check, ChevronDown, ClipboardCheck, Download, Loader2, MessageSquare, X } from "lucide-react"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { avisoError, avisoExito } from "@/lib/avisos"
import {
  descargarPdfSeguimiento,
  type ActividadSeguimiento,
  type RespuestaActividad,
  type Seguimiento,
} from "@/components/informes/tipos-seguimiento"

const fechaSesion = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es })
const fechaHora = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

export default function MisSeguimientosPage() {
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // El más reciente arranca abierto
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/seguimientos")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSeguimientos(data.seguimientos ?? [])
        setAbierto(data.seguimientos?.[0]?.id ?? null)
      })
      .catch((e) => setError(e.message || "No se pudieron cargar tus informes."))
      .finally(() => setCargando(false))
  }, [])

  // Al responder una actividad se actualiza solo esa, sin recargar la pantalla
  const actualizarActividad = (seguimientoId: string, actividad: ActividadSeguimiento) =>
    setSeguimientos((lista) =>
      lista.map((s) =>
        s.id === seguimientoId ? { ...s, actividades: s.actividades.map((a) => (a.id === actividad.id ? actividad : a)) } : s,
      ),
    )

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <EncabezadoPagina
          titulo="Mis informes de seguimiento"
          descripcion="Lo que trabajaste en cada sesión, tus actividades para la semana y las pautas de tu psicólogo/a."
          volverA="/informes"
          textoVolver="Volver a Informes"
        />

        {cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#F1C77A]" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-center text-red-300">{error}</p>
        ) : seguimientos.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#1D3434" }}>
            <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-[#F1C77A]" />
            <p className="text-gray-300">
              Todavía no tenés informes. Cuando tu psicólogo/a te comparta uno después de una sesión, te va a llegar un
              aviso y lo vas a ver acá.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {seguimientos.map((s) => (
              <TarjetaSeguimiento
                key={s.id}
                seguimiento={s}
                abierto={abierto === s.id}
                onAlternar={() => setAbierto(abierto === s.id ? null : s.id)}
                onRespondida={(a) => actualizarActividad(s.id, a)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TarjetaSeguimiento({
  seguimiento: s,
  abierto,
  onAlternar,
  onRespondida,
}: {
  seguimiento: Seguimiento
  abierto: boolean
  onAlternar: () => void
  onRespondida: (actividad: ActividadSeguimiento) => void
}) {
  const [descargando, setDescargando] = useState(false)
  const pendientes = s.actividades.filter((a) => !a.respuesta).length

  const descargar = async () => {
    setDescargando(true)
    const error = await descargarPdfSeguimiento(s.id)
    if (error) avisoError(error)
    setDescargando(false)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#2A4A4A]" style={{ backgroundColor: "#1D3434" }}>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/5"
      >
        <div className="min-w-0">
          <p className="font-semibold capitalize text-white">Sesión del {fechaSesion(s.fechaSesion)}</p>
          <p className="mt-0.5 text-sm text-gray-400">
            {s.psicologo ?? "Tu psicólogo/a"}
            {pendientes > 0 && (
              <span className="ml-2 rounded-full bg-[#F1C77A]/15 px-2 py-0.5 text-xs font-semibold text-[#F1C77A]">
                {pendientes} {pendientes === 1 ? "actividad sin responder" : "actividades sin responder"}
              </span>
            )}
          </p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-gray-400 transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div className="space-y-6 border-t border-gray-700 p-5">
          <Bloque titulo="Lo que trabajamos en la sesión" texto={s.resumen} />

          {s.actividades.length > 0 && (
            <div>
              <h3 className="mb-1 font-semibold text-white">Actividades hasta la próxima sesión</h3>
              <p className="mb-3 text-sm text-gray-400">Contale a tu psicólogo/a si pudiste hacerlas. Lo va a ver antes de la próxima sesión.</p>
              <ol className="space-y-3">
                {s.actividades.map((a, i) => (
                  <ActividadParaResponder key={a.id} numero={i + 1} actividad={a} onRespondida={onRespondida} />
                ))}
              </ol>
            </div>
          )}

          {s.pautas && <Bloque titulo="Pautas y recomendaciones" texto={s.pautas} />}
          {s.avances && <Bloque titulo="Avances y logros" texto={s.avances} destacado />}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-700 pt-4">
            <p className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarClock className="h-4 w-4 text-[#F1C77A]" />
              Próxima sesión: {s.proximaSesion ? fechaHora(s.proximaSesion) : "a coordinar"}
            </p>
            <Button
              variant="outline"
              onClick={descargar}
              disabled={descargando}
              className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A]/10"
            >
              {descargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Descargar PDF
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function ActividadParaResponder({
  numero,
  actividad,
  onRespondida,
}: {
  numero: number
  actividad: ActividadSeguimiento
  onRespondida: (actividad: ActividadSeguimiento) => void
}) {
  const [respuesta, setRespuesta] = useState<RespuestaActividad | null>(actividad.respuesta)
  const [comentario, setComentario] = useState(actividad.comentario ?? "")
  const [guardando, setGuardando] = useState(false)

  const sinCambios = respuesta === actividad.respuesta && comentario.trim() === (actividad.comentario ?? "")

  const enviar = async () => {
    if (!respuesta) return
    try {
      setGuardando(true)
      const res = await fetch(`/api/actividades-seguimiento/${actividad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta, comentario }),
      })
      const data = await res.json()
      if (!res.ok) {
        avisoError(data.error || "No se pudo guardar tu respuesta.")
        return
      }
      onRespondida({ ...actividad, respuesta: data.respuesta, comentario: data.comentario, fechaRespuesta: data.fechaRespuesta })
      avisoExito("¡Listo! Tu psicólogo/a ya puede verlo.")
    } catch {
      avisoError("No se pudo guardar tu respuesta. Verificá tu conexión.")
    } finally {
      setGuardando(false)
    }
  }

  const opcion = (valor: RespuestaActividad, texto: string, Icono: typeof Check, activa: string) => (
    <button
      type="button"
      onClick={() => setRespuesta(valor)}
      aria-pressed={respuesta === valor}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
        respuesta === valor ? activa : "border-gray-600 text-gray-300 hover:border-[#F1C77A]/70",
      )}
    >
      <Icono className="h-4 w-4" />
      {texto}
    </button>
  )

  return (
    <li className="rounded-xl border border-gray-700 bg-[#152A2A] p-4">
      <p className="text-gray-200">
        <span className="mr-2 font-semibold text-[#F1C77A]">{numero}.</span>
        {actividad.descripcion}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="¿Pudiste hacerla?">
        {opcion("HECHA", "La hice", Check, "border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-300")}
        {opcion("NO_PUDE", "No pude", X, "border-orange-400 bg-orange-400/15 font-semibold text-orange-300")}
      </div>
      {respuesta && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`comentario-${actividad.id}`} className="flex items-center gap-2 text-sm text-gray-300">
            <MessageSquare className="h-4 w-4 text-[#F1C77A]" />
            Comentario para tu psicólogo/a (opcional)
          </label>
          <Textarea
            id={`comentario-${actividad.id}`}
            rows={2}
            maxLength={500}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={respuesta === "HECHA" ? "Ej: Me ayudó mucho antes de dormir." : "Ej: No encontré el momento durante la semana."}
            className="border-gray-600 bg-[#1D3434] text-white focus:border-[#F1C77A]"
          />
          <div className="flex items-center justify-end gap-3">
            {actividad.fechaRespuesta && sinCambios && (
              <span className="text-xs text-gray-400">Enviado el {format(parseISO(actividad.fechaRespuesta), "d/MM HH:mm")}</span>
            )}
            <Button
              onClick={enviar}
              disabled={guardando || sinCambios}
              size="sm"
              style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
            >
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actividad.respuesta ? "Actualizar respuesta" : "Enviar respuesta"}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function Bloque({ titulo, texto, destacado = false }: { titulo: string; texto: string; destacado?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-white">{titulo}</h3>
      <p
        className={cn(
          "whitespace-pre-wrap rounded-lg border p-3",
          destacado ? "border-[#F1C77A]/40 bg-[#F1C77A]/10 text-gray-100" : "border-gray-700 bg-[#152A2A] text-gray-300",
        )}
      >
        {texto}
      </p>
    </div>
  )
}
