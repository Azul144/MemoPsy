// src/app/api/sesiones/[id]/pago/route.ts
// RF 3.5 - Registrar el estado de pago de una sesión.
// Va aparte del PUT de la sesión porque el pago se suele cargar cuando la sesión
// ya está Finalizada, y esas sesiones no se pueden editar.
import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { initializeDatabase } from "@/lib/database"
import { SesionEntity, MedioDePagoEntity } from "@/entities"
import { ESTADOS_PAGO, datosPago, puedeVerPagos } from "@/lib/sesiones/pagos"

const pagoSchema = z
  .object({
    estadoPago: z.enum(ESTADOS_PAGO),
    medioDePagoId: z.coerce.number().int().positive().nullable().optional(),
    monto: z.coerce.number().nonnegative({ message: "El monto no puede ser negativo" }).nullable().optional(),
  })
  .refine((d) => d.estadoPago !== "Pagado" || !!d.medioDePagoId, {
    message: "Indicá cómo se pagó la sesión",
    path: ["medioDePagoId"],
  })

async function manejarPATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!puedeVerPagos(session.user)) {
      return NextResponse.json({ error: "Sin permisos para registrar pagos" }, { status: 403 })
    }

    const validacion = pagoSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validacion.error.issues }, { status: 400 })
    }
    const { estadoPago, medioDePagoId, monto } = validacion.data

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const sesion = await sesionRepository.findOne({ where: { id }, relations: ["psicologo", "medioDePago"] })
    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    // El psicólogo solo registra pagos de sus propias sesiones; recepción, de todas
    const alcance = alcanceSesiones(session.user)
    const esSuya = alcance.tipo === "psicologo" && String(sesion.psicologo?.id ?? "") === alcance.id
    if (alcance.tipo !== "todas" && !esSuya) {
      return NextResponse.json({ error: "No tenés permiso para registrar el pago de esta sesión." }, { status: 403 })
    }

    if (estadoPago === "Pagado") {
      const medio = await dataSource.getRepository(MedioDePagoEntity).findOne({ where: { id: String(medioDePagoId) } })
      if (!medio) {
        return NextResponse.json(
          { error: "Medio de pago inválido", details: [{ path: ["medioDePagoId"], message: "Medio de pago inválido" }] },
          { status: 400 },
        )
      }
      sesion.estadoPago = "Pagado"
      sesion.medioDePago = medio
      sesion.monto = monto !== null && monto !== undefined ? monto.toFixed(2) : null
      // Si ya estaba pagada se conserva la fecha original del pago
      sesion.fechaPago = sesion.fechaPago ?? new Date()
    } else {
      sesion.estadoPago = "Pendiente"
      sesion.medioDePago = null
      sesion.monto = null
      sesion.fechaPago = null
    }

    await sesionRepository.save(sesion)
    return NextResponse.json({ message: "Pago registrado", pago: datosPago(sesion) })
  } catch (error: any) {
    console.error("Error registrando pago de sesión:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PATCH = conAuditoria(manejarPATCH, { modulo: "Sesiones", accion: "REGISTRAR_PAGO", detalle: (d) => (d?.pago?.estado ? `Estado de pago: ${d.pago.estado}` : "Registro de pago") })
