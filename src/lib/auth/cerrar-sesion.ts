// src/lib/auth/cerrar-sesion.ts
// Cierra la sesión y lleva al acceso que corresponde REEMPLAZANDO la página actual en el historial.
// Así, si la persona toca "atrás", no vuelve a una página protegida (que la mandaría al acceso otra vez).
// El paciente vuelve a su acceso (/pacientes), sin pasar por la portada; el resto, a /login.
//
// Se cierra con el pedido directo a NextAuth y no con signOut(): signOut avisa a la pantalla abierta que
// ya no hay sesión, y la pantalla mandaba a /login antes de que se llegara a /pacientes (pasaba en el celular).
import { getCsrfToken, getSession } from "next-auth/react";

export async function cerrarSesion() {
  const sesion = await getSession();
  const esPaciente = Boolean(sesion?.user?.pacienteId) || document.cookie.includes("memopsy_acceso=paciente");
  const destino = esPaciente ? "/pacientes" : "/login";
  try {
    const csrfToken = (await getCsrfToken()) ?? "";
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, json: "true" }),
    });
  } finally {
    window.location.replace(destino);
  }
}
