"use client"
// RF 3.1 - Horario pactado con el paciente: 1 o 2 horarios fijos por semana (día, hora y modalidad),
// en días distintos y dentro de los días y turnos en que atiende el psicólogo.
// Al guardar, MemoPsy crea solo los turnos de las próximas 4 semanas y los va renovando.

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { avisoExito } from "@/lib/avisos"
import { DIAS_ATENCION, horasDeInicio, type FranjaAtencion } from "@/lib/sesiones/turnos-atencion"

interface Pacto { diaSemana: number; horaInicio: string; modalidadId: number; modalidad?: string }
interface Modalidad { id: string | number; nombre: string }

const DURACION = 50
const MAXIMO = 2
const nombreDia = (n: number) => DIAS_ATENCION.find((d) => d.numero === n)?.nombre ?? ""
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const claseSelect = "h-10 rounded-lg border border-borde-fuerte bg-superficie px-3 text-sm text-foreground focus:border-dorado focus:outline-none"

export default function EditorPacto({
  psicologoId,
  pacienteId,
  puedeEditar = true,
  onGuardado,
}: {
  psicologoId: string | number
  pacienteId: string | number
  puedeEditar?: boolean
  onGuardado?: () => void
}) {
  const [pactos, setPactos] = useState<Pacto[] | null>(null)
  const [franjas, setFranjas] = useState<FranjaAtencion[]>([])
  const [modalidades, setModalidades] = useState<Modalidad[]>([])
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Pacto[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const cargar = useCallback(() => {
    fetch(`/api/pactos?pacienteId=${pacienteId}`)
      .then((r) => r.json())
      .then((d) => setPactos((d.pactos ?? []).filter((p: { psicologoId: number }) => String(p.psicologoId) === String(psicologoId))))
      .catch(() => setPactos([]))
  }, [pacienteId, psicologoId])

  useEffect(() => {
    cargar()
    if (!puedeEditar) return
    fetch(`/api/horarios-disponibles?psicologoId=${psicologoId}`).then((r) => r.json()).then((d) => setFranjas(d.franjas ?? [])).catch(() => {})
    fetch("/api/modalidades").then((r) => r.json()).then((d) => setModalidades(Array.isArray(d) ? d : d.modalidades ?? [])).catch(() => {})
  }, [cargar, psicologoId, puedeEditar])

  const diasConAtencion = DIAS_ATENCION.filter((d) => franjas.some((f) => f.diaSemana === d.numero))
  const presencial = modalidades.find((m) => m.nombre === "Presencial")

  const empezar = () => {
    setBorrador(pactos?.map((p) => ({ diaSemana: p.diaSemana, horaInicio: p.horaInicio, modalidadId: p.modalidadId })) ?? [])
    setError("")
    setEditando(true)
  }
  const agregar = () => {
    const libre = diasConAtencion.find((d) => !borrador.some((b) => b.diaSemana === d.numero))
    if (!libre) return
    const hora = horasDeInicio(franjas, libre.numero, DURACION)[0] ?? "08:00"
    setBorrador([...borrador, { diaSemana: libre.numero, horaInicio: hora, modalidadId: Number(presencial?.id ?? modalidades[0]?.id ?? 0) }])
  }
  const cambiar = (i: number, cambios: Partial<Pacto>) => {
    setBorrador(borrador.map((b, j) => {
      if (j !== i) return b
      const nuevo = { ...b, ...cambios }
      // Al cambiar de día, si la hora no existe ese día se toma la primera disponible
      const horas = horasDeInicio(franjas, nuevo.diaSemana, DURACION)
      if (!horas.includes(nuevo.horaInicio)) nuevo.horaInicio = horas[0] ?? nuevo.horaInicio
      return nuevo
    }))
  }

  const guardar = async () => {
    setGuardando(true)
    setError("")
    try {
      const res = await fetch("/api/pactos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psicologoId: Number(psicologoId), pacienteId: Number(pacienteId), horarios: borrador }),
      })
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(datos.error || "No se pudo guardar el horario pactado.")
      avisoExito(
        borrador.length === 0
          ? "Se quitó el horario pactado."
          : `Horario pactado: ${datos.resumen}.${datos.creados ? ` Se crearon ${datos.creados} turnos de las próximas semanas.` : ""}`,
      )
      setEditando(false)
      cargar()
      onGuardado?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el horario pactado.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="rounded-2xl border border-dorado/40 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-dorado">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            Horario pactado
          </h2>
          <p className="mt-1 text-sm text-suave">
            El día y la hora fijos que acordaron. MemoPsy crea solo los turnos de las próximas 4 semanas.
          </p>
        </div>
        {puedeEditar && !editando && pactos && (
          <Button type="button" variant="outline" size="sm" onClick={empezar} className="rounded-full border-dorado text-dorado hover:bg-primary hover:text-primary-foreground">
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            {pactos.length ? "Cambiar" : "Pactar horario"}
          </Button>
        )}
      </div>

      {pactos === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-suave"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</p>
      ) : !editando ? (
        pactos.length === 0 ? (
          <p className="mt-4 text-sm text-tenue">Todavía no tiene un horario pactado.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-3">
            {pactos.map((p) => (
              <li key={p.diaSemana} className="rounded-xl border border-borde bg-superficie/40 px-4 py-3">
                <p className="font-semibold text-crema">{mayuscula(nombreDia(p.diaSemana))} · {p.horaInicio}</p>
                <p className="text-sm text-suave">{p.modalidad}</p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="mt-4 space-y-3">
          {diasConAtencion.length === 0 && (
            <p className="text-sm text-aviso">Primero cargá tus días y horarios de atención en Turnos.</p>
          )}
          {borrador.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select aria-label="Día" value={b.diaSemana} onChange={(e) => cambiar(i, { diaSemana: Number(e.target.value) })} className={claseSelect}>
                {diasConAtencion
                  .filter((d) => d.numero === b.diaSemana || !borrador.some((x) => x.diaSemana === d.numero))
                  .map((d) => <option key={d.numero} value={d.numero}>{mayuscula(d.nombre)}</option>)}
              </select>
              <select aria-label="Hora" value={b.horaInicio} onChange={(e) => cambiar(i, { horaInicio: e.target.value })} className={claseSelect}>
                {horasDeInicio(franjas, b.diaSemana, DURACION).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select aria-label="Modalidad" value={b.modalidadId} onChange={(e) => cambiar(i, { modalidadId: Number(e.target.value) })} className={claseSelect}>
                {modalidades.map((m) => <option key={m.id} value={Number(m.id)}>{m.nombre}</option>)}
              </select>
              <Button type="button" variant="ghost" size="icon" aria-label="Quitar este horario" onClick={() => setBorrador(borrador.filter((_, j) => j !== i))} className="text-peligro hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {borrador.length < MAXIMO && borrador.length < diasConAtencion.length && (
            <Button type="button" variant="ghost" size="sm" onClick={agregar} className="text-dorado hover:bg-primary/10">
              <Plus className="mr-1 h-4 w-4" /> {borrador.length ? "Agregar otro día" : "Agregar un día"}
            </Button>
          )}
          <p className="text-xs text-tenue">Hasta {MAXIMO} por semana, en días distintos. Cada sesión dura {DURACION} minutos.</p>
          {error && (
            <p className="flex items-start gap-2 text-sm text-peligro" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={guardar} disabled={guardando} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditando(false)} disabled={guardando} className="rounded-full border-borde-fuerte text-suave">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
