// src/app/(auth)/pacientes/page.tsx
// Enlace fijo del paciente (memopsy/pacientes), como el campus virtual de una facultad: el paciente
// lo guarda y entra directo a su cuenta, sin pasar por la portada, que está pensada para el psicólogo.
// Es el mismo inicio de sesión que /login; lo que ve después depende de su rol.
import type { Metadata } from "next";
import FormularioIngreso from "@/components/acceso/FormularioIngreso";

export const metadata: Metadata = { title: "MemoPsy · Acceso para pacientes" };

export default function AccesoPacientesPage() {
  return <FormularioIngreso paraPaciente />;
}
