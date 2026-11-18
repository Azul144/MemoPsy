// src/lib/whatsapp/conversacion.ts
// En qué paso de la charla con el chatbot está cada celular. No guarda el texto de los mensajes:
// solo de qué turno se habla, qué se le preguntó y, al reprogramar, qué horarios se le ofrecieron.
import { initializeDatabase } from "@/lib/database";

export type PasoConversacion =
  | "INICIO"
  | "RECORDATORIO" // se le mandó el recordatorio de id_sesion
  | "CONFIRMAR_CANCELACION" // se le preguntó si de verdad quiere cancelar id_sesion
  | "ELEGIR_HORARIO"; // se le ofrecieron horarios (opciones) para mover id_sesion

export interface Conversacion {
  sesionId: number | null;
  paso: PasoConversacion;
  opciones: { inicio: string; fin: string }[] | null;
  ultimaAlerta?: Date | null;
  actualizada?: Date;
}

// Una pregunta sin responder vence a las 2 horas (después, un "1" vuelve a ser el menú)
const HORAS_VIGENCIA = 2;

export async function leerConversacion(telefono: string): Promise<Conversacion> {
  const dataSource = await initializeDatabase();
  const filas: { sesionId: number | null; paso: PasoConversacion; opciones: string | null; ultimaAlerta: Date | null; actualizada: Date }[] =
    await dataSource.query(
      `SELECT id_sesion AS sesionId, paso, opciones, ultima_alerta AS ultimaAlerta, actualizada
         FROM whatsapp_conversacion WHERE telefono = ?`,
      [telefono],
    );
  const fila = filas[0];
  if (!fila) return { sesionId: null, paso: "INICIO", opciones: null, ultimaAlerta: null };
  const vencida = Date.now() - new Date(fila.actualizada).getTime() > HORAS_VIGENCIA * 60 * 60 * 1000;
  // El recordatorio vale más tiempo: el paciente puede contestarlo al día siguiente
  const paso = vencida && fila.paso !== "RECORDATORIO" ? "INICIO" : fila.paso;
  let opciones: Conversacion["opciones"] = null;
  try {
    opciones = fila.opciones ? JSON.parse(fila.opciones) : null;
  } catch {
    opciones = null;
  }
  return {
    sesionId: fila.sesionId != null ? Number(fila.sesionId) : null,
    paso,
    opciones: paso === "ELEGIR_HORARIO" ? opciones : null,
    ultimaAlerta: fila.ultimaAlerta ? new Date(fila.ultimaAlerta) : null,
  };
}

export async function guardarConversacion(
  telefono: string,
  c: Pick<Conversacion, "sesionId" | "paso" | "opciones">,
): Promise<void> {
  const dataSource = await initializeDatabase();
  await dataSource.query(
    `INSERT INTO whatsapp_conversacion (telefono, id_sesion, paso, opciones) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id_sesion = VALUES(id_sesion), paso = VALUES(paso), opciones = VALUES(opciones), actualizada = NOW()`,
    [telefono, c.sesionId, c.paso, c.opciones ? JSON.stringify(c.opciones) : null],
  );
}

export async function marcarAlerta(telefono: string): Promise<void> {
  const dataSource = await initializeDatabase();
  await dataSource.query(
    `INSERT INTO whatsapp_conversacion (telefono, paso, ultima_alerta) VALUES (?, 'INICIO', NOW())
     ON DUPLICATE KEY UPDATE ultima_alerta = NOW()`,
    [telefono],
  );
}
