// src/app/api/usuarios/[id]/bienvenida/route.ts
// Reenvía al paciente el email de bienvenida con el enlace para crear su contraseña.
// Sirve si no le llegó, lo borró o se le venció el enlace. Solo para cuentas de paciente activas.
// Su contraseña actual no cambia hasta que use el enlace.
import { type NextRequest, NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/database"
import { UsuarioEntity, PacienteEntity } from "@/entities"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { describirUsuario } from "@/lib/auditoria/detalle"
import { enviarBienvenidaPaciente } from "@/lib/email/bienvenida-paciente"

async function manejarPOST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dataSource = await initializeDatabase()
  const usuario = await dataSource.getRepository(UsuarioEntity).findOne({ where: { id }, relations: ["persona"] })
  if (!usuario || !usuario.persona) {
    return NextResponse.json({ message: "No se encontró el usuario." }, { status: 404 })
  }
  if (!usuario.activo) {
    return NextResponse.json({ message: "La cuenta está desactivada: activala antes de enviar el acceso." }, { status: 409 })
  }
  const paciente = await dataSource.getRepository(PacienteEntity).findOne({ where: { persona: { id: usuario.persona.id } } })
  if (!paciente) {
    return NextResponse.json({ message: "El email de acceso es solo para pacientes." }, { status: 400 })
  }

  const resultado = await enviarBienvenidaPaciente(Number(usuario.id), usuario.email, usuario.persona.nombre)
  if (resultado === "sin-casilla") {
    return NextResponse.json({ message: "Es una cuenta de demostración (@...test): no tiene casilla de email real." }, { status: 400 })
  }
  if (resultado === "error") {
    return NextResponse.json({ message: "No se pudo enviar el email. Probá de nuevo en un rato." }, { status: 502 })
  }
  return NextResponse.json({ ok: true, email: usuario.email })
}

// RF 1.4 - Queda en la auditoría quién envió el acceso y a qué cuenta (nunca el enlace)
export const POST = conAuditoria(manejarPOST, {
  modulo: "Usuarios",
  accion: "ENVIAR_ACCESO",
  detalle: async (_d, { entidadId }) => `Envió el email de acceso a ${await describirUsuario(await initializeDatabase(), entidadId)}`,
})
