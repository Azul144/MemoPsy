// src/lib/auth/cerrar-sesion.ts
// Cierra la sesión y lleva al login REEMPLAZANDO la página actual en el historial.
// Así, si la persona toca "atrás", no vuelve a una página protegida (que la mandaría al login otra vez).
import { getSession, signOut } from "next-auth/react";

// El paciente vuelve a su acceso (/pacientes), sin pasar por la portada; el resto, a /login.
export async function cerrarSesion() {
  const sesion = await getSession();
  const destino = sesion?.user?.pacienteId ? "/pacientes" : "/login";
  await signOut({ redirect: false });
  window.location.replace(destino);
}
