// src/lib/videollamada/index.ts
// RF 3.4 - Enlace de videollamada automático para las sesiones remotas.
// Si el profesional escribió un enlace, se respeta. Si lo dejó vacío, se genera uno:
// Google Meet cuando hay credenciales de Google en .env.local; si no (o si Google falla), Jitsi Meet.
import type { EntityManager } from "typeorm";
import { ModalidadEntity } from "@/entities";
import { enlaceGoogleMeet, googleMeetConfigurado } from "./google-meet";
import { enlaceJitsi } from "./jitsi";

export async function esModalidadRemota(manager: EntityManager, modalidadId: string | number): Promise<boolean> {
  const modalidad = await manager.findOne(ModalidadEntity, { where: { id: String(modalidadId) } });
  return modalidad?.nombre?.toLowerCase() === "remota";
}

async function generarEnlace(inicio: Date, fin: Date): Promise<string> {
  if (googleMeetConfigurado()) {
    try {
      return await enlaceGoogleMeet(inicio, fin);
    } catch (error) {
      console.error("No se pudo crear la reunión de Google Meet, se usa Jitsi:", error);
    }
  }
  return enlaceJitsi();
}

// Devuelve el enlace que hay que guardar en la sesión (o null si no corresponde)
export async function enlaceParaSesion(params: {
  manager: EntityManager;
  modalidadId: string | number;
  enlaceEscrito: unknown;
  inicio: Date;
  fin: Date;
}): Promise<string | null> {
  const escrito = typeof params.enlaceEscrito === "string" ? params.enlaceEscrito.trim() : "";
  if (escrito) return escrito;
  if (!(await esModalidadRemota(params.manager, params.modalidadId))) return null;
  return generarEnlace(params.inicio, params.fin);
}
