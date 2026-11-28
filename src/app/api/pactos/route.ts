// src/app/api/pactos/route.ts
// RF 3.1 - Horario pactado entre el psicólogo y el paciente.
//  GET ?psicologoId=  → los pacientes con horario pactado de ese psicólogo (su semana)
//  GET ?pacienteId=   → el horario pactado de ese paciente
//  PUT { psicologoId, pacienteId, horarios: [{ diaSemana, horaInicio, modalidadId }] }
//      → reemplaza el pacto y crea los turnos de las próximas semanas
// Cada uno ve lo suyo: el psicólogo, sus pacientes; el paciente, su pacto; recepción y auditoría, todo.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { initializeDatabase } from "@/lib/database"
import { avisoDeMargen, generarTurnosPactados, guardarPacto, margenDelPsicologo, resumenPacto, validarPacto } from "@/lib/sesiones/pacto"
import { PsicologoEntity } from "@/entities"

interface FilaPacto {
  id: number
  psicologoId: number
  pacienteId: number
  diaSemana: number
  horaInicio: string
  modalidadId: number
  modalidad: string
  paciente: string
  psicologo: string
}

async function leerPactos(where: string, valor: number): Promise<FilaPacto[]> {
  const db = await initializeDatabase()
  const filas: FilaPacto[] = await db.query(
    `SELECT hp.id_horario_pactado AS id, hp.id_psicologo AS psicologoId, hp.id_paciente AS pacienteId,
            hp.dia_semana AS diaSemana, DATE_FORMAT(hp.hora_inicio, '%H:%i') AS horaInicio,
            hp.id_modalidad AS modalidadId, m.nombre AS modalidad,
            CONCAT(pe.nombre, ' ', pe.apellido) AS paciente, CONCAT(ps.nombre, ' ', ps.apellido) AS psicologo
       FROM horario_pactado hp
       JOIN modalidad m ON m.id_modalidad = hp.id_modalidad
       JOIN paciente pa ON pa.id_paciente = hp.id_paciente JOIN persona pe ON pe.id_persona = pa.id_persona
       JOIN psicologo p ON p.id_psicologo = hp.id_psicologo JOIN persona ps ON ps.id_persona = p.id_persona
      WHERE hp.activo = 1 AND ${where} = ?
      ORDER BY hp.dia_semana, hp.hora_inicio`,
    [valor],
  )
  return filas.map((f) => ({ ...f, id: Number(f.id), psicologoId: Number(f.psicologoId), pacienteId: Number(f.pacienteId), diaSemana: Number(f.diaSemana), modalidadId: Number(f.modalidadId) }))
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig)
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const alcance = alcanceSesiones(session.user)
  const params = request.nextUrl.searchParams
  let psicologoId = Number(params.get("psicologoId")) || null
  let pacienteId = Number(params.get("pacienteId")) || null

  if (alcance.tipo === "paciente") pacienteId = Number(alcance.id) // el paciente solo ve su pacto
  if (alcance.tipo === "psicologo" && !pacienteId) psicologoId = Number(alcance.id)
  if (alcance.tipo === "ninguna") return NextResponse.json({ error: "Sin acceso" }, { status: 403 })

  // Al mirar la agenda se completan los turnos que falten de las próximas semanas. Así no depende
  // solo de la pasada del servidor (en Render gratis el servidor se duerme y no corre cada hora).
  const generados = pacienteId || psicologoId
    ? await generarTurnosPactados(await initializeDatabase(), pacienteId ? { pacienteId } : { psicologoId: psicologoId! })
    : { creados: 0 }

  let pactos = pacienteId ? await leerPactos("hp.id_paciente", pacienteId) : psicologoId ? await leerPactos("hp.id_psicologo", psicologoId) : []
  // El psicólogo ve solo lo pactado con él
  if (alcance.tipo === "psicologo") pactos = pactos.filter((p) => String(p.psicologoId) === alcance.id)
  // Para «Mi semana»: lugares por semana, pactados, libres y reservados
  const margen = !pacienteId && psicologoId ? await margenDelPsicologo(await initializeDatabase(), psicologoId) : undefined

  return NextResponse.json({ pactos, margen, turnosNuevos: generados.creados, ...(generados.error ? { errorTurnos: generados.error } : {}) })
}

const horarioSchema = z.object({
  diaSemana: z.number().int(),
  horaInicio: z.string(),
  modalidadId: z.coerce.number().int(),
})
const pactoSchema = z.object({
  psicologoId: z.coerce.number().int(),
  pacienteId: z.coerce.number().int(),
  horarios: z.array(horarioSchema).max(5),
  // Ya vio el aviso de que se queda sin lugares libres y quiere pactar igual
  confirmar: z.boolean().optional(),
})

async function manejarPUT(request: NextRequest) {
  const session = await getServerSession(authConfig)
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const datos = pactoSchema.safeParse(await request.json().catch(() => null))
  if (!datos.success) return NextResponse.json({ error: "Datos del horario pactado incompletos." }, { status: 400 })
  const { psicologoId, pacienteId, horarios, confirmar } = datos.data

  // El psicólogo pacta solo con sus pacientes; recepción, para cualquier psicólogo
  const alcance = alcanceSesiones(session.user)
  if (alcance.tipo !== "todas" && !(alcance.tipo === "psicologo" && alcance.id === String(psicologoId))) {
    return NextResponse.json({ error: "Solo podés pactar horarios con tus pacientes." }, { status: 403 })
  }

  const db = await initializeDatabase()
  const motivo = await validarPacto(db, psicologoId, pacienteId, horarios)
  if (motivo) return NextResponse.json({ error: motivo }, { status: 409 })
  if (!confirmar) {
    const aviso = await avisoDeMargen(db, psicologoId, pacienteId, horarios)
    if (aviso) return NextResponse.json({ aviso, requiereConfirmar: true }, { status: 409 })
  }

  const { creados } = await guardarPacto(db, psicologoId, pacienteId, horarios)
  return NextResponse.json({ ok: true, creados, resumen: resumenPacto(horarios), pactos: await leerPactos("hp.id_paciente", pacienteId) })
}

// RF 1.4 - Queda en la auditoría quién cambió el horario pactado y cómo quedó (no es dato clínico)
export const PUT = conAuditoria(manejarPUT, {
  modulo: "Sesiones",
  accion: "PACTAR_HORARIO",
  detalle: (d) => (d?.ok ? `Horario pactado: ${d.resumen || "sin horario"}; ${d.creados} turnos nuevos` : null),
})

// PATCH { psicologoId, reservados } → cuántos lugares por semana quiere dejar libres
const reservadosSchema = z.object({ psicologoId: z.coerce.number().int(), reservados: z.coerce.number().int().min(0).max(30) })

async function manejarPATCH(request: NextRequest) {
  const session = await getServerSession(authConfig)
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const datos = reservadosSchema.safeParse(await request.json().catch(() => null))
  if (!datos.success) return NextResponse.json({ error: "Indicá cuántos lugares querés reservar (0 a 30)." }, { status: 400 })
  const { psicologoId, reservados } = datos.data
  const alcance = alcanceSesiones(session.user)
  if (alcance.tipo !== "todas" && !(alcance.tipo === "psicologo" && alcance.id === String(psicologoId))) {
    return NextResponse.json({ error: "Solo podés cambiar tu propia agenda." }, { status: 403 })
  }
  const db = await initializeDatabase()
  await db.getRepository(PsicologoEntity).update(String(psicologoId), { lugaresReservados: reservados })
  return NextResponse.json({ ok: true, reservados, margen: await margenDelPsicologo(db, psicologoId) })
}

export const PATCH = conAuditoria(manejarPATCH, {
  modulo: "Sesiones",
  accion: "RESERVAR_LUGARES",
  detalle: (d) => (d?.ok ? `Lugares libres reservados por semana: ${d.reservados}` : null),
})
