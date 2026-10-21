// RNF Seguridad - Los datos clínicos se guardan cifrados en la base (AES-256-GCM).
// Se usa como "transformer" en las columnas de TypeORM: cifra al guardar y descifra al leer,
// así el resto del sistema trabaja con el texto normal y en la base solo queda el texto cifrado.
// Consecuencia: no se puede buscar con LIKE dentro de estas columnas.
import type { ValueTransformer } from "typeorm";
import { cifrar, descifrar, estaCifrado } from "./cifrado";

export const columnaCifrada: ValueTransformer = {
  to(valor: unknown) {
    if (typeof valor !== "string" || estaCifrado(valor)) return valor;
    return cifrar(valor, "DATOS_ENCRYPTION_KEY");
  },
  from(valor: unknown) {
    // Las filas guardadas antes del cifrado se leen tal cual hasta que se corre scripts/cifrar-datos-existentes.mjs
    if (typeof valor !== "string" || !estaCifrado(valor)) return valor;
    return descifrar(valor, "DATOS_ENCRYPTION_KEY");
  },
};
