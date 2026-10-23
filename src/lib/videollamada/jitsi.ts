// src/lib/videollamada/jitsi.ts
// Enlace de Jitsi Meet: no necesita cuenta ni credenciales, la sala se crea al entrar.
// El nombre lleva una parte aleatoria larga para que nadie pueda adivinarlo.
import { randomBytes } from "crypto";

export function enlaceJitsi(): string {
  const sala = randomBytes(9).toString("base64url").replace(/[-_]/g, "x");
  return `https://meet.jit.si/MemoPsy-${sala}`;
}
