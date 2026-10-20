// src/lib/sesiones/pagos.ts
// RF 3.5 - Estado de pago de cada sesión.
// Solo lo ven quienes tienen el permiso "Registrar Pago" (psicólogo para sus sesiones,
// recepción para todas). El resto de los roles no recibe estos datos desde el servidor.

import type { SesionEntity } from "@/entities"

export const PERMISO_PAGOS = "Registrar Pago"

export const ESTADOS_PAGO = ["Pendiente", "Pagado"] as const
export type EstadoPago = (typeof ESTADOS_PAGO)[number]

export function puedeVerPagos(usuario: { permisos?: { nombre?: string }[] }): boolean {
  return (usuario.permisos ?? []).some((p) => p?.nombre === PERMISO_PAGOS)
}

// Lo que se envía al navegador sobre el pago de una sesión
export function datosPago(sesion: SesionEntity) {
  return {
    estado: sesion.estadoPago || "Pendiente",
    medio: sesion.medioDePago ? { id: sesion.medioDePago.id, descripcion: sesion.medioDePago.descripcion } : null,
    monto: sesion.monto !== null && sesion.monto !== undefined ? Number(sesion.monto) : null,
    fecha: sesion.fechaPago ? sesion.fechaPago.toISOString() : null,
  }
}
