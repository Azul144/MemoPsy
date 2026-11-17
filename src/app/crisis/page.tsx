// src/app/crisis/page.tsx
// Página pública de ayuda en crisis: se abre sin iniciar sesión, a cualquier hora,
// desde el botón del login y de la portada. No guarda ni envía ningún dato.
import type { Metadata } from "next"
import AyudaCrisis from "@/components/crisis/AyudaCrisis"

export const metadata: Metadata = {
  title: "Ayuda en crisis | MemoPsy",
  description: "Teléfonos de emergencia y pautas para atravesar un momento de crisis. Disponible sin iniciar sesión.",
}

export default function CrisisPage() {
  return <AyudaCrisis />
}
