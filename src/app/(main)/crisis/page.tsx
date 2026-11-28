"use client"
// src/app/(main)/crisis/page.tsx
// RF 4.3 - Aviso de crisis: el paciente, con la sesión iniciada, toca «Avisar a mi psicólogo/a» y en ese
// mismo momento se le avisa a su psicólogo/a, sin elegir qué le pasa (lo que lo disparó lo habla en sesión).
// El aviso le llega al profesional por la campanita, por WhatsApp y por email.
// El sistema no da indicaciones ni técnicas: quien decide cómo intervenir es el psicólogo/a.
// Después de avisar se muestran los teléfonos de emergencia, porque el profesional puede tardar en ver el aviso.
// La misma tarjeta está en el inicio del paciente; a esta página llegan el menú y el chatbot de WhatsApp.

import { useSession } from "next-auth/react"
import { AlertCircle, Check, HeartHandshake, Loader2 } from "lucide-react"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina"
import { Button } from "@/components/ui/button"
import { LineasEmergencia, useAvisoCrisis } from "@/components/crisis/aviso-crisis"

export default function AvisoCrisisPage() {
  const { data: session, status } = useSession()
  const { estado, error, canales, avisar } = useAvisoCrisis()

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

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <EncabezadoPagina
        titulo="Avisar a mi psicólogo/a"
        descripcion="Con un toque, tu psicólogo/a recibe el aviso al instante, con el día y la hora. Lo que te pasó lo charlan en la sesión."
        volverA="/welcome"
        textoVolver="Volver al inicio"
      />

      {estado === "enviado" ? (
        <section className="space-y-4 rounded-3xl border border-borde bg-card p-6" role="status">
          <p className="flex items-center gap-2 text-lg font-semibold text-exito">
            <Check className="h-5 w-5" aria-hidden="true" />
            Tu psicólogo/a ya recibió el aviso.
          </p>
          <p className="text-suave">
            Le avisamos que estás pasando un momento difícil{canales.length > 0 ? ` (${canales.join(", ")})` : ""}. Se va a
            comunicar con vos cuando lo vea: no es atención inmediata.
          </p>
          <LineasEmergencia className="rounded-2xl bg-superficie p-4 text-crema" />
        </section>
      ) : (
        <section className="space-y-5 rounded-3xl bg-crisis-fondo p-6 text-crisis-texto">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-crisis-icono-fondo text-crisis-icono">
              <HeartHandshake className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold">¿Momento difícil?</p>
              <p className="mt-1 text-crisis-texto-2">Tocá el botón y tu psicólogo/a recibe un aviso al momento. No hace falta explicar nada.</p>
            </div>
          </div>
          <Button
            onClick={avisar}
            disabled={estado === "enviando"}
            className="h-12 w-full rounded-full bg-crisis-boton text-base font-semibold text-crisis-boton-texto hover:bg-crisis-boton/90"
          >
            {estado === "enviando" && <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />}
            {estado === "enviando" ? "Avisando..." : "Avisar a mi psicólogo/a"}
          </Button>
          {estado === "error" && (
            <p className="flex items-start gap-2 text-sm" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <p className="text-xs leading-relaxed text-crisis-texto-2">Solo se envía el aviso con el día y la hora. Si estás en peligro ahora, llamá al 911.</p>
        </section>
      )}
    </main>
  )
}
