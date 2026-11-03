// app/api/usuarios/me/route.ts
// RF 1.3 - Datos de la cuenta propia. Cada usuario ve y edita solo los suyos.
import * as bcrypt from "bcrypt";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authConfig } from "@/lib/auth/auth-config";
import { registrarIntentoFallido } from "@/lib/auth/login";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities";
import { AYUDA_CELULAR, normalizarCelular } from "@/lib/telefono";
import { esEmailValido, normalizarEmail } from "@/lib/validaciones/password";

const datosSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido").max(100),
  apellido: z.string().trim().min(1, "El apellido es requerido").max(100),
  email: z.string().trim().max(100),
  telefono: z.string().nullish(),
  passwordActual: z.string().optional(),
});

async function buscarUsuario(id: string) {
  const ds = await initializeDatabase();
  const repo = ds.getRepository(UsuarioEntity);
  return { repo, usuario: await repo.findOne({ where: { id }, relations: ["persona"] }) };
}

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { usuario } = await buscarUsuario(session.user.id);
  if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  return NextResponse.json({
    nombre: usuario.persona.nombre,
    apellido: usuario.persona.apellido,
    dni: usuario.persona.dni,
    telefono: usuario.persona.telefono ?? "",
    email: usuario.email,
  });
}

async function manejarPUT(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const validacion = datosSchema.safeParse(await request.json().catch(() => null));
  if (!validacion.success) {
    return NextResponse.json({ error: validacion.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { nombre, apellido, telefono, passwordActual } = validacion.data;

  const email = normalizarEmail(validacion.data.email);
  if (!esEmailValido(email)) return NextResponse.json({ error: "El email no es válido" }, { status: 400 });

  const celular = normalizarCelular(telefono);
  if (celular === undefined) return NextResponse.json({ error: AYUDA_CELULAR }, { status: 400 });

  try {
    const { repo, usuario } = await buscarUsuario(session.user.id);
    if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    // El email es el dato con el que se inicia sesión: cambiarlo exige la contraseña actual
    const cambiaEmail = email !== normalizarEmail(usuario.email);
    if (cambiaEmail) {
      if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
        return NextResponse.json({ error: "Por muchos intentos fallidos, probá de nuevo en unos minutos." }, { status: 429 });
      }
      if (!passwordActual || !(await bcrypt.compare(passwordActual, usuario.password))) {
        await registrarIntentoFallido(repo, usuario);
        return NextResponse.json({ error: "Para cambiar el email, escribí tu contraseña actual correcta." }, { status: 400 });
      }
      if ((await repo.createQueryBuilder("u").where("LOWER(u.email) = :email", { email }).getCount()) > 0) {
        return NextResponse.json({ error: "Este email ya está en uso" }, { status: 409 });
      }
      await repo.update(usuario.id, { email, intentosFallidos: 0 });
    }

    usuario.persona.nombre = nombre;
    usuario.persona.apellido = apellido;
    usuario.persona.telefono = celular;
    await repo.manager.save(usuario.persona);

    return NextResponse.json({ ok: true, id: usuario.id });
  } catch (error) {
    console.error("Error en PUT /api/usuarios/me:", (error as Error)?.name);
    return NextResponse.json({ error: "No se pudieron guardar los datos." }, { status: 500 });
  }
}

// RF 1.4 - Queda en la auditoría, sin los datos personales
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "EDITAR", detalle: "Edición de los datos de la cuenta propia" });
