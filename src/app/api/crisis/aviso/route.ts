// src/app/api/crisis/aviso/route.ts
// RF 4.3 - El paciente que inició sesión le avisa a su psicólogo/a que está en un momento difícil (un solo toque).
// Solo lo puede hacer un paciente, y solo sobre su propia cuenta.
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { avisarCrisisAlPsicologo } from "@/lib/crisis/aviso-psicologo"

async function manejarPOST() {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return NextResponse.json({ error: "Iniciá sesión para avisarle a tu psicólogo." }, { status: 401 })
  }
  const pacienteId = session.user.pacienteId
  if (!pacienteId) {
    return NextResponse.json({ error: "Solo un paciente puede avisarle a su psicólogo desde aquí." }, { status: 403 })
  }

  const persona = session.user.persona
  const nombre = persona ? `${persona.nombre} ${persona.apellido}` : session.user.email ?? "Un paciente"
  const resultado = await avisarCrisisAlPsicologo(Number(pacienteId), nombre)
  if (resultado.avisados === 0) {
    return NextResponse.json(
      { error: "Todavía no tenés un psicólogo asignado en MemoPsy. Si estás en peligro, llamá al 911 o al 0800 999 0091." },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: true, repetido: resultado.repetido, canales: resultado.canales })
}

// RF 1.4 - Queda en la auditoría que se envió el aviso
export const POST = conAuditoria(manejarPOST, {
  modulo: "Sesiones",
  accion: "AVISO_CRISIS",
  detalle: (r) => (r?.repetido ? null : "Aviso de crisis al psicólogo"),
})
