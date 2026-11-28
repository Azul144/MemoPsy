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
// Sin indicaciones ni ejercicios: la intervención la decide el profesional.
export function LineasEmergencia({ className, textoClassName }: { className?: string; textoClassName?: string }) {
  return (
    <div className={className}>
      <p className={cn("text-sm font-semibold", textoClassName)}>Si estás en peligro ahora, no esperes la respuesta: llamá.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LINEAS_EMERGENCIA.map((l) => (
          <a
            key={l.numero}
            href={`tel:${l.marcar}`}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
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
