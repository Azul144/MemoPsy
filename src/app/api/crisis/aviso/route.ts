// src/app/api/crisis/aviso/route.ts
// RF 4.3 - Cuando el paciente que inició sesión elige qué le pasa en la ayuda en crisis, se le avisa
// a su psicólogo. Solo lo puede hacer un paciente, y solo sobre su propia cuenta.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { GUIAS } from "@/lib/crisis/contenido"
import { avisarCrisisAlPsicologo } from "@/lib/crisis/aviso-psicologo"

const avisoSchema = z.object({ situacion: z.string() })

async function manejarPOST(request: NextRequest) {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return NextResponse.json({ error: "Iniciá sesión para avisarle a tu psicólogo." }, { status: 401 })
  }
  const pacienteId = session.user.pacienteId
  if (!pacienteId) {
    return NextResponse.json({ error: "Solo un paciente puede avisarle a su psicólogo desde aquí." }, { status: 403 })
  }

  const datos = avisoSchema.safeParse(await request.json().catch(() => null))
  const guia = datos.success ? GUIAS.find((g) => g.id === datos.data.situacion) : undefined
  // "Alguien cercano está en crisis" no es una crisis del paciente: no se avisa
  if (!guia || guia.id === "acompanar") {
    return NextResponse.json({ error: "Elegí primero qué te está pasando." }, { status: 400 })
  }

  const persona = session.user.persona
  const nombre = persona ? `${persona.nombre} ${persona.apellido}` : session.user.email ?? "Un paciente"
  const resultado = await avisarCrisisAlPsicologo(Number(pacienteId), nombre, guia)
  if (resultado.avisados === 0) {
    return NextResponse.json(
      { error: "Todavía no tenés un psicólogo asignado en MemoPsy. Si estás en peligro, llamá a los teléfonos de arriba." },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: true, repetido: resultado.repetido })
}

// RF 1.4 - Queda en la auditoría que se envió el aviso, sin la situación elegida (dato de salud)
export const POST = conAuditoria(manejarPOST, {
  modulo: "Sesiones",
  accion: "AVISO_CRISIS",
  detalle: (r) => (r?.repetido ? null : "Aviso al psicólogo desde la ayuda en crisis"),
})
