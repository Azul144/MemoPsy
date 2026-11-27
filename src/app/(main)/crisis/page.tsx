"use client"
// src/app/(main)/crisis/page.tsx
// RF 4.3 - Aviso de crisis: el paciente, con la sesión iniciada, toca lo que le está pasando y en ese
// mismo momento se le avisa a su psicólogo/a (sin pasos intermedios). El aviso le llega al profesional por la campanita, por WhatsApp y por email.
// El sistema no da indicaciones ni técnicas: quien decide cómo intervenir es el psicólogo/a.
// Solo ante la opción de riesgo se muestran los teléfonos de emergencia, porque el profesional
// puede tardar en ver el aviso.

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  AlertCircle,
  Check,
  CloudFog,
  CloudRain,
  Flame,
  Loader2,
  MessageCircleQuestion,
  Phone,
  ShieldAlert,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina"
import { Button } from "@/components/ui/button"
import { LINEAS_EMERGENCIA, SITUACIONES_CRISIS, type SituacionCrisis } from "@/lib/crisis/contenido"
import { cn } from "@/lib/utils"

type Estado = "eligiendo" | "enviando" | "enviado" | "error"

// Ícono de cada situación, para que la lista se lea de un vistazo
const ICONOS: Record<string, LucideIcon> = {
  ansiedad: Wind,
  estres: Zap,
  angustia: CloudRain,
  enojo: Flame,
  desconexion: CloudFog,
  otra: MessageCircleQuestion,
  dano: ShieldAlert,
}

export default function AvisoCrisisPage() {
  const { data: session, status } = useSession()
  const [elegida, setElegida] = useState<SituacionCrisis | null>(null)
  const [estado, setEstado] = useState<Estado>("eligiendo")
  const [error, setError] = useState("")
  const [canales, setCanales] = useState<string[]>([])

  // Tocar la opción ya envía el aviso
  const avisar = async (situacion: SituacionCrisis) => {
    setElegida(situacion)
    setEstado("enviando")
    setError("")
    try {
      const res = await fetch("/api/crisis/aviso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situacion: situacion.id }),
      })
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(datos.error || "No se pudo enviar el aviso. Probá de nuevo en un rato.")
        setEstado("error")
        return
      }
      setCanales(Array.isArray(datos.canales) ? datos.canales : [])
      setEstado("enviado")
    } catch {
      setError("No se pudo enviar el aviso. Revisá tu conexión.")
      setEstado("error")
    }
  }

  if (status === "loading") return null

  // Solo el paciente le avisa a su psicólogo/a (la API lo vuelve a controlar)
  if (!session?.user?.pacienteId) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <EncabezadoPagina titulo="Avisar a mi psicólogo/a" volverA="/welcome" textoVolver="Volver al inicio" />
        <p className="text-suave">Esta opción es para pacientes: les permite avisarle a su psicólogo/a que están atravesando una crisis.</p>
      </main>
    )
  }

  const riesgo = !!elegida?.riesgo

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <EncabezadoPagina
        titulo="Avisar a mi psicólogo/a"
        descripcion="Tocá lo que más se parece a lo que te pasa y tu psicólogo/a recibe el aviso al instante, con el día y la hora."
        volverA="/welcome"
        textoVolver="Volver al inicio"
      />

      {estado === "enviado" && elegida ? (
        <section className="space-y-4 rounded-3xl border border-borde bg-card p-6" role="status">
          <p className="flex items-center gap-2 text-lg font-semibold text-exito">
            <Check className="h-5 w-5" aria-hidden="true" />
            Tu psicólogo/a ya recibió el aviso.
          </p>
          <p className="text-suave">
            Le avisamos que elegiste «{elegida.titulo}»
            {canales.length > 0 ? ` (${canales.join(", ")})` : ""}. Se va a comunicar con vos cuando lo vea: no es atención inmediata.
          </p>
          {riesgo && <Emergencia />}
          <Button
            variant="outline"
            onClick={() => {
              setElegida(null)
              setEstado("eligiendo")
            }}
            className="border-borde-fuerte text-suave hover:bg-superficie hover:text-foreground"
          >
            Listo
          </Button>
        </section>
      ) : (
        <section className="space-y-5">
          <ul className="grid gap-3 sm:grid-cols-2">
            {SITUACIONES_CRISIS.map((s) => {
              const activa = elegida?.id === s.id
              const Icono = ICONOS[s.id] ?? MessageCircleQuestion
              const enviandoEsta = estado === "enviando" && activa
              return (
                <li key={s.id} className={cn(s.riesgo && "sm:col-span-2")}>
                  <button
                    type="button"
                    onClick={() => avisar(s)}
                    aria-pressed={activa}
                    disabled={estado === "enviando"}
                    className={cn(
                      "flex h-full w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait",
                      s.riesgo
                        ? activa
                          ? "border-red-300 bg-red-500/30"
                          : "border-red-400/60 bg-red-500/10 hover:bg-red-500/20"
                        : activa
                          ? "border-dorado bg-primary/15"
                          : "border-borde bg-card hover:border-dorado/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        s.riesgo ? "bg-red-500 text-white" : "bg-primary/15 text-dorado",
                      )}
                    >
                      {enviandoEsta ? (
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      ) : (
                        <Icono className="h-6 w-6" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug text-crema">{s.titulo}</span>
                      <span className="mt-1 block text-sm leading-snug text-suave">
                        {enviandoEsta ? "Avisando a tu psicólogo/a..." : s.subtitulo}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {estado === "error" && (
            <p className="flex items-start gap-2 text-sm text-peligro" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <p className="text-xs leading-relaxed text-tenue">
            Solo se envía lo que tocaste, con el día y la hora. Si estás en peligro ahora, llamá al 911.
          </p>
        </section>
      )}
    </main>
  )
}

// Teléfonos de emergencia: solo ante la opción de riesgo, sin indicaciones ni ejercicios
function Emergencia() {
  return (
    <div className="rounded-2xl border border-red-400/50 bg-red-500/10 p-4">
      <p className="text-sm font-semibold text-crema">Si estás en peligro ahora, no esperes la respuesta: llamá.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LINEAS_EMERGENCIA.map((l) => (
          <a
            key={l.numero}
            href={`tel:${l.marcar}`}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {l.numero}
            <span className="font-medium">· {l.nombre}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
