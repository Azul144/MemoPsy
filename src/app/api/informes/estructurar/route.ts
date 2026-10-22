// src/app/api/informes/estructurar/route.ts
// Recibe el texto dictado de una nota clínica y devuelve una propuesta ordenada por la IA.
// No guarda nada: el profesional decide si usa la propuesta. La auditoría registra el uso,
// nunca el contenido clínico.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import {
  estructurarNota,
  iaConfigurada,
  IaNoConfiguradaError,
  IaRechazoError,
  notaComoTexto,
} from "@/lib/ia/estructurar-nota";

const LARGO_MAXIMO = 20000;

// Le dice a la pantalla si hay clave configurada, para desactivar el botón si no la hay.
// Nunca devuelve la clave.
export async function GET() {
  return NextResponse.json({ configurada: iaConfigurada() });
}

async function manejarPOST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const permisos = session.user.permisos?.map((p) => p.nombre) ?? [];
  const puedeUsar = permisos.includes("Registrar Informe") || permisos.includes("Editar Informe");
  if (!puedeUsar || !session.user.psicologoId) {
    return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ message: "Falta el texto a estructurar." }, { status: 400 });
  }
  if (texto.length > LARGO_MAXIMO) {
    return NextResponse.json({ message: `El texto supera los ${LARGO_MAXIMO} caracteres.` }, { status: 400 });
  }

  try {
    const nota = await estructurarNota(texto);
    return NextResponse.json({ ...nota, texto: notaComoTexto(nota) }, { status: 200 });
  } catch (error) {
    if (error instanceof IaNoConfiguradaError) {
      return NextResponse.json({ message: "La IA no está configurada en este servidor." }, { status: 503 });
    }
    if (error instanceof IaRechazoError) {
      return NextResponse.json({ message: "La IA no pudo ordenar este texto. Podés editarlo a mano." }, { status: 422 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ message: "La IA está ocupada. Probá de nuevo en un momento." }, { status: 503 });
    }
    // Se registra solo el tipo de error: el mensaje podría incluir parte del texto clínico
    console.error("Error en POST /api/informes/estructurar:", error instanceof Anthropic.APIError ? `API ${error.status}` : (error as Error)?.name);
    return NextResponse.json({ message: "No se pudo conectar con el servicio de IA." }, { status: 502 });
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Informes", accion: "ESTRUCTURAR_IA", detalle: "Propuesta de nota generada con IA" });
