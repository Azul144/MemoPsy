// src/lib/auth/alcance-sesiones.ts
// Define QUÉ sesiones (turnos) puede ver o modificar cada persona según su rol (RF 4.2 y 4.3).
//  - Recepción y Auditoría: todas las sesiones del consultorio.
//  - Psicólogo: solo las sesiones que atiende.
//  - Paciente: solo las sesiones en las que participa.

interface UsuarioSesion {
  permisos?: { nombre?: string }[];
  psicologoId?: string | null;
  pacienteId?: string | null;
}

interface SesionResumen {
  psicologo?: { id?: string | number } | null;
  pacientes?: ({ id?: string | number } | null)[];
}

export type Alcance =
  | { tipo: "todas" }
  | { tipo: "psicologo"; id: string }
  | { tipo: "paciente"; id: string }
  | { tipo: "ninguna" };

export function alcanceSesiones(usuario: UsuarioSesion): Alcance {
  const permisos = (usuario.permisos ?? []).map((p) => p?.nombre);
  // Recepción (gestiona la agenda completa) y Auditor (solo lectura de todo el consultorio)
  if (permisos.includes("Asignar Profesional") || permisos.includes("Eliminar Sesión") || permisos.includes("Ver Usuarios")) {
    return { tipo: "todas" };
  }
  if (usuario.psicologoId) return { tipo: "psicologo", id: String(usuario.psicologoId) };
  if (usuario.pacienteId) return { tipo: "paciente", id: String(usuario.pacienteId) };
  return { tipo: "ninguna" };
}

export function puedeVerSesion(alcance: Alcance, sesion: SesionResumen): boolean {
  switch (alcance.tipo) {
    case "todas":
      return true;
    case "psicologo":
      return String(sesion.psicologo?.id ?? "") === alcance.id;
    case "paciente":
      return (sesion.pacientes ?? []).some((p) => String(p?.id ?? "") === alcance.id);
    default:
      return false;
  }
}
