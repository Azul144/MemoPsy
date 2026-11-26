// src/app/crisis/page.tsx
// Página pública de ayuda en crisis: se abre sin iniciar sesión, a cualquier hora,
// desde el botón del login y de la portada, y también desde el inicio del paciente con la sesión
// iniciada. No guarda nada; solo envía un aviso al psicólogo si el paciente lo pide (RF 4.3).
import type { Metadata } from "next"
import AyudaCrisis from "@/components/crisis/AyudaCrisis"

export const metadata: Metadata = {
  title: "Ayuda en crisis | MemoPsy",
  description: "Teléfonos de emergencia y pautas para atravesar un momento de crisis. Disponible sin iniciar sesión.",
}

export default function CrisisPage() {
  return <AyudaCrisis />
}
