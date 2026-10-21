// src/lib/auditoria/registrar.ts
// RF 1.4 - Escribe un evento en el registro de auditoría (RNF02, Ley 25.326).
// Nunca corta la operación principal: si falla el registro, se avisa en consola y se sigue.
// Importante: en "detalle" va QUÉ se hizo, nunca contenido clínico ni contraseñas.
import { initializeDatabase } from "@/lib/database";
import { AuditoriaEntity } from "@/entities";

export interface EventoAuditoria {
  usuarioId?: string | number | null;
  email?: string | null;
  accion: string;
  modulo: string;
  entidadId?: string | number | null;
  detalle?: string | null;
  ip?: string | null;
}

type CabecerasLike = Headers | Record<string, string | string[] | undefined> | undefined | null;

// IP de quien hace el pedido (detrás de un proxy viene en x-forwarded-for)
export function ipDelPedido(cabeceras: CabecerasLike): string | null {
  if (!cabeceras) return null;
  const leer = (nombre: string): string | undefined => {
    if (cabeceras instanceof Headers) return cabeceras.get(nombre) ?? undefined;
    const valor = cabeceras[nombre];
    return Array.isArray(valor) ? valor[0] : valor;
  };
  const ip = leer("x-forwarded-for")?.split(",")[0]?.trim() || leer("x-real-ip")?.trim();
  return ip ? ip.slice(0, 45) : null;
}

const recortar = (texto: string | null | undefined, max: number) =>
  texto ? String(texto).slice(0, max) : null;

export async function registrarAuditoria(evento: EventoAuditoria): Promise<void> {
  try {
    const dataSource = await initializeDatabase();
    const usuarioId = evento.usuarioId != null && /^\d+$/.test(String(evento.usuarioId)) ? Number(evento.usuarioId) : null;
    await dataSource.getRepository(AuditoriaEntity).insert({
      usuarioId,
      email: recortar(evento.email, 255),
      accion: recortar(evento.accion, 40) ?? "DESCONOCIDA",
      modulo: recortar(evento.modulo, 40) ?? "Sistema",
      entidadId: evento.entidadId != null ? recortar(String(evento.entidadId), 50) : null,
      detalle: recortar(evento.detalle, 500),
      ip: recortar(evento.ip, 45),
    });
  } catch {
    console.error("No se pudo registrar el evento de auditoría"); // sin datos personales
  }
}
