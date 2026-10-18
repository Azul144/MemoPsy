// src/lib/validaciones/password.ts
// Reglas de contraseña y email (RNF02). Las usan la pantalla (para mostrar ✔/✖)
// y el servidor (para rechazar). Si cambia una regla, se cambia SOLO acá.

export const REQUISITOS_PASSWORD = [
  { id: "largo", texto: "Al menos 10 caracteres", cumple: (p: string) => p.length >= 10 },
  { id: "mayuscula", texto: "Una letra mayúscula", cumple: (p: string) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: "minuscula", texto: "Una letra minúscula", cumple: (p: string) => /[a-záéíóúñ]/.test(p) },
  { id: "numero", texto: "Un número", cumple: (p: string) => /\d/.test(p) },
  {
    id: "simbolo",
    texto: "Un símbolo (por ejemplo ! ? # @ $)",
    cumple: (p: string) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p),
  },
];

// bcrypt solo tiene en cuenta los primeros 72 caracteres
const LARGO_MAXIMO = 72;

// Devuelve la lista de problemas. Lista vacía = contraseña válida.
export function validarPassword(password: string, email = ""): string[] {
  const errores = REQUISITOS_PASSWORD.filter((r) => !r.cumple(password)).map((r) => r.texto);

  if (password.length > LARGO_MAXIMO) {
    errores.push(`Como máximo ${LARGO_MAXIMO} caracteres`);
  }

  const parteDelEmail = email.split("@")[0].toLowerCase();
  if (parteDelEmail.length >= 3 && password.toLowerCase().includes(parteDelEmail)) {
    errores.push("No puede contener tu email");
  }

  return errores;
}

// Emails siempre en minúsculas y sin espacios: "Laura@X.com " y "laura@x.com" son el mismo
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}