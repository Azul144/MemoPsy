// src/lib/auditoria/con-auditoria.ts
// Envoltorio para las rutas de la API: ejecuta el handler tal cual y, según cómo terminó,
// deja asentado el evento en el registro de auditoría (RF 1.4).
//  - Respuesta exitosa (< 400): se registra la acción (CREAR, EDITAR, VER, ...).
//  - 403: se registra un ACCESO_DENEGADO (intento de hacer algo sin permiso).
//  - Otros errores (datos inválidos, no encontrado, etc.): no se registran.
//
// Uso:  export const PUT = conAuditoria(actualizar, { modulo: "Informes", accion: "EDITAR" })
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { ipDelPedido, registrarAuditoria } from "./registrar";

interface OpcionesAuditoria {
  modulo: string;
  accion: string;
  // Texto fijo, o calculado a partir de la respuesta (por ejemplo el nuevo estado del turno)
  detalle?: string | ((datosRespuesta: any) => string | null | undefined);
}

// Busca el id del registro afectado: primero en la URL (/api/x/[id]); si es un alta, en la respuesta
function idDeLaRespuesta(datos: any): string | null {
  const id =
    datos?.id ?? datos?.data?.id ?? datos?.informe?.id ?? datos?.sesion?.id ??
    datos?.usuario?.id ?? datos?.perfil?.id ?? datos?.persona?.id;
  return id != null ? String(id) : null;
}

export function conAuditoria<A extends [NextRequest, ...any[]], R extends Response>(
  handler: (...args: A) => Promise<R>,
  opciones: OpcionesAuditoria,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const respuesta = await handler(...args);
    const exito = respuesta.status < 400;
    const denegado = respuesta.status === 403;
    if (!exito && !denegado) return respuesta;

    try {
      const [request, contexto] = args;
      const session = await getServerSession(authConfig);

      const params = contexto?.params ? await contexto.params : undefined;
      let entidadId: string | null = params?.id != null ? String(params.id) : null;

      let datos: any = null;
      if (exito && (!entidadId || typeof opciones.detalle === "function")) {
        try {
          datos = await respuesta.clone().json();
        } catch {
          datos = null; // la respuesta no era JSON
        }
        entidadId = entidadId ?? idDeLaRespuesta(datos);
      }

      const detalle = denegado
        ? `Intento sin permiso: ${opciones.accion.toLowerCase()} en ${opciones.modulo}`
        : typeof opciones.detalle === "function"
          ? opciones.detalle(datos)
          : opciones.detalle;

      await registrarAuditoria({
        usuarioId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        accion: denegado ? "ACCESO_DENEGADO" : opciones.accion,
        modulo: opciones.modulo,
        entidadId,
        detalle: detalle ?? null,
        ip: ipDelPedido(request.headers),
      });
    } catch {
      console.error("No se pudo preparar el evento de auditoría");
    }
    return respuesta;
  };
}
