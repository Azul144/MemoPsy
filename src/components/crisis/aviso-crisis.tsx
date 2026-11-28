"use client"
// src/components/crisis/aviso-crisis.tsx
// RF 4.3 - Aviso de crisis con un solo toque: el paciente toca «Avisar a mi psicólogo/a» y el aviso sale en
// ese momento, sin elegir qué le pasa (lo que lo disparó lo charla después en sesión).
// Lo usan la tarjeta «¿Momento difícil?» del inicio y la página /crisis.
import { useState } from "react"
import { Phone } from "lucide-react"
import { LINEAS_EMERGENCIA } from "@/lib/crisis/contenido"
import { cn } from "@/lib/utils"

export type EstadoAviso = "listo" | "enviando" | "enviado" | "error"

export function useAvisoCrisis() {
  const [estado, setEstado] = useState<EstadoAviso>("listo")
  const [error, setError] = useState("")
  const [canales, setCanales] = useState<string[]>([])

  const avisar = async () => {
    if (estado === "enviando") return
    setEstado("enviando")
    setError("")
    try {
      const res = await fetch("/api/crisis/aviso", { method: "POST" })
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

  return { estado, error, canales, avisar, reiniciar: () => setEstado("listo") }
}

// Teléfonos de emergencia, después de avisar: el psicólogo puede tardar en ver el aviso.
// Una fila por teléfono (el número en una sola línea y una descripción corta abajo), con el color del lugar
// donde se muestra: solo el círculo del teléfono va en rojo, para que se vea sin alarmar.
// Sin indicaciones ni ejercicios: la intervención la decide el profesional.
export function LineasEmergencia({ className, textoClassName }: { className?: string; textoClassName?: string }) {
  return (
    <div className={className}>
      <p className={cn("text-sm font-semibold", textoClassName)}>¿Estás en peligro ahora? No esperes, llamá:</p>
      <ul className="mt-2 space-y-2">
        {LINEAS_EMERGENCIA.map((l) => (
          <li key={l.numero}>
            <a
              href={`tel:${l.marcar}`}
              className="flex items-center gap-3 rounded-2xl border border-current/15 px-3 py-2 transition-colors hover:bg-current/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block whitespace-nowrap text-base font-bold">{l.numero}</span>
                <span className="block text-xs opacity-75">{l.corto}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
