// src/lib/auth/cerrar-sesion.ts
// Cierra la sesión y lleva al login REEMPLAZANDO la página actual en el historial.
// Así, si la persona toca "atrás", no vuelve a una página protegida (que la mandaría al login otra vez).
import { signOut } from "next-auth/react";

export async function cerrarSesion() {
  await signOut({ redirect: false });
  window.location.replace("/login");
}
