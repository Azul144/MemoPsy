// src/app/api/auditoria/route.ts
// RF 1.4 - Consulta del registro de auditoría (solo lectura, para el Auditor y el Administrador).
// No existen POST/PUT/DELETE: el registro solo se escribe desde el propio sistema.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { AuditoriaEntity } from "@/entities"

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const permisos = session.user.permisos?.map((p) => p.nombre) ?? []
    if (!permisos.includes("Ver Auditoría")) {
      return NextResponse.json({ error: "Sin permiso para ver la auditoría" }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const page = Math.max(1, Number.parseInt(sp.get("page") || "1", 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") || "20", 10) || 20))
    const usuario = sp.get("usuario")?.trim()
    const modulo = sp.get("modulo")?.trim()
    const accion = sp.get("accion")?.trim()
    const desde = sp.get("desde")?.trim()
    const hasta = sp.get("hasta")?.trim()

    const dataSource = await initializeDatabase()
    const repo = dataSource.getRepository(AuditoriaEntity)
    const qb = repo.createQueryBuilder("a")

    if (usuario) qb.andWhere("LOWER(a.email) LIKE LOWER(:usuario)", { usuario: `%${usuario}%` })
    if (modulo) qb.andWhere("a.modulo = :modulo", { modulo })
    if (accion) qb.andWhere("a.accion = :accion", { accion })
    if (desde && FECHA.test(desde)) qb.andWhere("a.fecha >= :desde", { desde: `${desde} 00:00:00` })
    if (hasta && FECHA.test(hasta)) qb.andWhere("a.fecha < DATE_ADD(:hasta, INTERVAL 1 DAY)", { hasta })

    qb.orderBy("a.fecha", "DESC").addOrderBy("a.id", "DESC")

    const [eventos, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount()

    // Valores existentes, para armar los filtros de la pantalla
    const [modulos, acciones] = await Promise.all([
      repo.createQueryBuilder("a").select("DISTINCT a.modulo", "valor").orderBy("valor").getRawMany(),
      repo.createQueryBuilder("a").select("DISTINCT a.accion", "valor").orderBy("valor").getRawMany(),
    ])

    return NextResponse.json({
      data: eventos,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      opciones: {
        modulos: modulos.map((m) => m.valor),
        acciones: acciones.map((a) => a.valor),
      },
    })
  } catch (error) {
    console.error("Error al consultar la auditoría:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
