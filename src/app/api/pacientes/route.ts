// src/app/api/pacientes/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { ObraSocialEntity, PacienteEntity, PersonaEntity } from "@/entities"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { AYUDA_CELULAR, normalizarCelular } from "@/lib/telefono"

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const pacienteRepository = dataSource.getRepository(PacienteEntity)

    const pacientes = await pacienteRepository.find({
      relations: ["persona", "obraSocial"],
      order: {
        persona: {
          apellido: "ASC",
        },
      },
    })

    const pacientesTransformados = pacientes.map((paciente) => ({
      id: paciente.id,
      persona: {
        nombre: paciente.persona.nombre,
        apellido: paciente.persona.apellido,
      },
      obraSocial: {
        nombre: paciente.obraSocial.nombre,
      },
    }))

    return NextResponse.json(pacientesTransformados)
  } catch (error) {
    console.error("Error fetching patients:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}


// ---------------------------------------------------------------------------------------------
// Alta rápida de un paciente nuevo, sin cuenta para entrar al sistema (por ejemplo, alguien que
// viene por primera vez y paga particular). La usan la nota clínica y el registro de turnos.
//  - Si el DNI ya es de un paciente, no lo duplica: responde 409 con ese paciente para usarlo.
//  - Si el DNI es de una persona que todavía no es paciente (por ejemplo, alguien del personal),
//    la reutiliza y le crea el paciente.
// Después, si hace falta, la recepción le crea la cuenta y queda conectada al mismo paciente.
// ---------------------------------------------------------------------------------------------

export interface PacienteNuevoCreado {
  id: string
  persona: { nombre: string; apellido: string; dni: string; nombreCompleto: string }
}

const paraEnviar = (p: PacienteEntity): PacienteNuevoCreado => ({
  id: String(p.id),
  persona: {
    nombre: p.persona.nombre,
    apellido: p.persona.apellido,
    dni: p.persona.dni,
    nombreCompleto: `${p.persona.nombre} ${p.persona.apellido}`,
  },
})

// "juan carlos" -> "Juan Carlos"
const nombrePropio = (t: string) =>
  t.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, letra) => sep + letra.toUpperCase())

async function manejarPOST(request: NextRequest) {
  const session = await getServerSession(authConfig)
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const nombre = typeof body?.nombre === "string" ? nombrePropio(body.nombre) : ""
  const apellido = typeof body?.apellido === "string" ? nombrePropio(body.apellido) : ""
  const dni = typeof body?.dni === "string" ? body.dni.replace(/\D/g, "") : ""
  const fechaNacimiento = typeof body?.fechaNacimiento === "string" ? body.fechaNacimiento : ""
  const celular = normalizarCelular(body?.telefono ?? null)

  const errores: Record<string, string> = {}
  if (nombre.length < 2) errores.nombre = "Escribí el nombre."
  if (apellido.length < 2) errores.apellido = "Escribí el apellido."
  if (!/^\d{7,8}$/.test(dni)) errores.dni = "El DNI tiene que tener 7 u 8 números."
  const nacimiento = /^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) ? new Date(`${fechaNacimiento}T12:00:00`) : null
  if (!nacimiento || Number.isNaN(nacimiento.getTime()) || nacimiento > new Date() || nacimiento.getFullYear() < 1900) {
    errores.fechaNacimiento = "Elegí una fecha de nacimiento válida."
  }
  if (celular === undefined) errores.telefono = `El celular no es válido. ${AYUDA_CELULAR}`
  if (Object.keys(errores).length > 0) return NextResponse.json({ error: "Revisá los datos.", errores }, { status: 400 })

  try {
    const ds = await initializeDatabase()
    const obraSocialId = body?.obraSocialId ? String(body.obraSocialId) : null
    const obraSocial = obraSocialId
      ? await ds.getRepository(ObraSocialEntity).findOne({ where: { id: obraSocialId } })
      : await ds.getRepository(ObraSocialEntity).findOne({ where: { nombre: "Particular" } })
    if (obraSocialId && !obraSocial) return NextResponse.json({ error: "La obra social no existe." }, { status: 400 })

    // ¿Ya está cargado ese DNI?
    const existente = await ds.getRepository(PacienteEntity).findOne({ where: { persona: { dni } }, relations: ["persona"] })
    if (existente) {
      return NextResponse.json(
        { error: `Ya hay un paciente con ese DNI: ${existente.persona.nombre} ${existente.persona.apellido}.`, existente: paraEnviar(existente) },
        { status: 409 },
      )
    }

    const creado = await ds.transaction(async (m) => {
      let persona = await m.getRepository(PersonaEntity).findOne({ where: { dni } })
      if (!persona) {
        persona = await m.getRepository(PersonaEntity).save(
          m.getRepository(PersonaEntity).create({ nombre, apellido, dni, fechaNacimiento: nacimiento!, telefono: celular }),
        )
      }
      const paciente = await m.getRepository(PacienteEntity).save(
        m.getRepository(PacienteEntity).create({ persona, obraSocial: obraSocial ?? undefined }),
      )
      paciente.persona = persona
      return paciente
    })
    return NextResponse.json(paraEnviar(creado), { status: 201 })
  } catch (error) {
    console.error("Error en POST /api/pacientes:", (error as Error)?.name)
    return NextResponse.json({ error: "No se pudo registrar el paciente." }, { status: 500 })
  }
}

// Queda en la auditoría (sin los datos personales)
export const POST = conAuditoria(manejarPOST, {
  modulo: "Pacientes",
  accion: "CREAR",
  detalle: (d) => `Paciente nuevo (sin cuenta): ${d?.persona?.nombreCompleto ?? "sin nombre"}`,
})
