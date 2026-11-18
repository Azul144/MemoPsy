// src/lib/whatsapp/chatbot.ts
// Chatbot de WhatsApp de MemoPsy (RF 3.2, RF 3.3 y RF 4.3). Es un bot de menú, sin inteligencia
// artificial: cada respuesta es un texto fijo y cada acción usa las mismas reglas que la web.
//  1  Confirmar el próximo turno
//  2  Cancelarlo (pide confirmación)
//  3  Reprogramarlo dentro de las franjas del psicólogo (con 24 h de anticipación)
//  4  Ayuda en crisis
//  BAJA / ALTA  dejar de recibir o volver a recibir mensajes
// Antes que nada se revisa si el mensaje puede indicar una crisis: en ese caso se responde con
// la ayuda de crisis y se avisa al psicólogo, sin importar en qué paso esté la charla.
import { initializeDatabase } from "@/lib/database";
import { PacienteTieneSesionEntity, SesionEntity } from "@/entities";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { fechaTurno, notificarCambioDeTurno, notificarPsicologo } from "@/lib/notificaciones/notificar";
import { buscarHorariosLibres, HORAS_ANTICIPACION } from "@/lib/sesiones/horarios-libres";
import { cambiarEstadoTurno, ErrorHorarioOcupado, moverTurno, turnoTerminado } from "@/lib/sesiones/acciones-paciente";
import { normalizarCelular } from "@/lib/telefono";
import { avisarCrisis } from "./alerta-crisis";
import { guardarConversacion, leerConversacion, marcarAlerta, type Conversacion } from "./conversacion";
import { detectarCrisis, normalizar, respuestaCrisis, type NivelCrisis } from "./crisis";

export interface MensajeEntrante {
  telefono: string; // como lo manda Twilio: "whatsapp:+5493704123456"
  texto: string;
  boton: string | null; // ButtonPayload de los botones del recordatorio: CONFIRMAR o CANCELAR
}

interface Paciente {
  pacienteId: number;
  usuarioId: number;
  email: string;
  nombre: string;
  apellido: string;
  acepta: boolean;
}

// No se repite el aviso al psicólogo si el paciente escribe varios mensajes seguidos
const MINUTOS_ENTRE_ALERTAS = 15;
const MAX_HORARIOS = 6;

const urlBase = () => (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
const FIRMA = "\n\n— MemoPsy (mensaje automático)";

const MENU =
  "Respondé con un número:\n" +
  "*1* Confirmar el turno\n" +
  "*2* Cancelar el turno\n" +
  "*3* Reprogramar el turno\n" +
  "*4* Necesito ayuda ahora (crisis)\n\n" +
  "Escribí *BAJA* si no querés recibir más mensajes.";

// ----- Interpretación del mensaje -----

type Intencion =
  | { tipo: "crisis"; nivel: NivelCrisis }
  | { tipo: "baja" }
  | { tipo: "alta" }
  | { tipo: "confirmar" }
  | { tipo: "cancelar" }
  | { tipo: "reprogramar" }
  | { tipo: "si" }
  | { tipo: "no" }
  | { tipo: "numero"; valor: number }
  | { tipo: "menu" };

export function interpretar(texto: string, boton: string | null): Intencion {
  const nivel = detectarCrisis(texto);
  if (nivel) return { tipo: "crisis", nivel };
  if (boton === "CONFIRMAR") return { tipo: "confirmar" };
  if (boton === "CANCELAR") return { tipo: "cancelar" };

  const t = normalizar(texto);
  if (/^(4|ayuda|crisis|sos)$/.test(t)) return { tipo: "crisis", nivel: "malestar" };
  if (/^(baja|stop|no quiero (recibir )?mas mensajes)$/.test(t)) return { tipo: "baja" };
  if (/^(alta|suscribirme|quiero recibir mensajes)$/.test(t)) return { tipo: "alta" };
  if (/^(si|sí|dale|ok|okey|de acuerdo|confirmo cancelar|si cancelar)$/.test(t)) return { tipo: "si" };
  if (/^(no|mejor no|no cancelar)$/.test(t)) return { tipo: "no" };
  if (/^\d{1,2}$/.test(t)) return { tipo: "numero", valor: Number(t) };
  if (/\b(confirmo|confirmar|voy a ir|ahi estare|asisto)\b/.test(t)) return { tipo: "confirmar" };
  if (/\b(cancelar|cancelo|no puedo ir|no voy a poder)\b/.test(t)) return { tipo: "cancelar" };
  if (/\b(reprogramar|cambiar (el )?(turno|horario)|otro (dia|horario))\b/.test(t)) return { tipo: "reprogramar" };
  return { tipo: "menu" };
}

// ----- Datos -----

async function buscarPaciente(celular: string): Promise<Paciente | null> {
  const dataSource = await initializeDatabase();
  const filas: { pacienteId: number; usuarioId: number; email: string; nombre: string; apellido: string; acepta: Date | null }[] =
    await dataSource.query(
      `SELECT pa.id_paciente AS pacienteId, u.id_usuario AS usuarioId, u.email, pe.nombre, pe.apellido,
              pe.whatsapp_acepta AS acepta
         FROM persona pe
         JOIN paciente pa ON pa.id_persona = pe.id_persona
         JOIN usuario u ON u.id_persona = pe.id_persona AND u.activo = 1
        WHERE pe.telefono = ?
        LIMIT 1`,
      [celular],
    );
  const f = filas[0];
  return f
    ? { pacienteId: Number(f.pacienteId), usuarioId: Number(f.usuarioId), email: f.email, nombre: f.nombre, apellido: f.apellido, acepta: f.acepta != null }
    : null;
}

async function cargarTurno(sesionId: number) {
  const dataSource = await initializeDatabase();
  return dataSource.getRepository(SesionEntity).findOne({
    where: { id: String(sesionId) },
    relations: ["psicologo", "psicologo.persona", "estado", "modalidad"],
  });
}

// El turno del que se habla: el del recordatorio (si sigue vigente) o el próximo del paciente
async function turnoActual(paciente: Paciente, conversacion: Conversacion) {
  const dataSource = await initializeDatabase();
  const ids: { sesionId: number }[] = await dataSource.query(
    `SELECT s.id_sesion AS sesionId
       FROM sesion s
       JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
       JOIN estado e ON e.id_estado = s.id_estado
      WHERE pts.id_paciente = ? AND s.fecha_hora_inicio > NOW()
        AND e.nombre NOT IN ('Cancelada', 'Finalizada')
      ORDER BY (s.id_sesion = ?) DESC, s.fecha_hora_inicio ASC
      LIMIT 1`,
    [paciente.pacienteId, conversacion.sesionId ?? 0],
  );
  return ids[0] ? cargarTurno(Number(ids[0].sesionId)) : null;
}

const nombreCompleto = (p?: { nombre?: string; apellido?: string } | null) =>
  p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() : "";

function describirTurno(sesion: SesionEntity, articulo: "el" | "del" = "del"): string {
  const modalidad = sesion.modalidad?.nombre ? ` (${sesion.modalidad.nombre.toLowerCase()})` : "";
  return `${articulo} ${fechaTurno(sesion.fechaHoraInicio)} con ${nombreCompleto(sesion.psicologo?.persona)}${modalidad}`;
}

async function auditar(paciente: Paciente, accion: string, modulo: string, detalle: string, entidadId?: string | number) {
  await registrarAuditoria({ usuarioId: paciente.usuarioId, email: paciente.email, accion, modulo, detalle, entidadId: entidadId ?? null, ip: null });
}

// ----- Respuesta -----

export async function responderMensaje(m: MensajeEntrante): Promise<string> {
  const celular = normalizarCelular(m.telefono.replace(/^whatsapp:/, "")) ?? null;
  const intencion = interpretar(m.texto ?? "", m.boton);
  const paciente = celular ? await buscarPaciente(celular) : null;
  const conversacion = celular ? await leerConversacion(celular) : { sesionId: null, paso: "INICIO" as const, opciones: null };

  // 1) Crisis: primero que todo, desde cualquier paso
  if (intencion.tipo === "crisis") {
    let avisado = false;
    if (paciente && celular) {
      const reciente =
        conversacion.ultimaAlerta && Date.now() - conversacion.ultimaAlerta.getTime() < MINUTOS_ENTRE_ALERTAS * 60 * 1000;
      if (reciente) {
        avisado = true;
      } else {
        try {
          avisado = (await avisarCrisis(paciente.pacienteId, nombreCompleto(paciente), intencion.nivel)) > 0;
          await marcarAlerta(celular);
        } catch {
          console.error("No se pudo avisar al psicólogo de un mensaje de crisis");
        }
      }
      // En la auditoría queda el evento, nunca el texto del mensaje
      await auditar(paciente, "CRISIS_WHATSAPP", "WhatsApp", intencion.nivel === "riesgo" ? "Mensaje con posible riesgo" : "Pedido de ayuda en crisis");
    }
    return respuestaCrisis(intencion.nivel, `${urlBase()}/crisis`, avisado);
  }

  // 2) Celular desconocido
  if (!paciente || !celular) {
    return (
      "Hola. Este es el número automático de recordatorios de MemoPsy y no reconoce tu celular. " +
      "Si sos paciente, pedile al consultorio que cargue este número en tu cuenta.\n\n" +
      `Si estás pasando un momento difícil, escribí *AYUDA* o abrí ${urlBase()}/crisis` +
      FIRMA
    );
  }

  const dataSource = await initializeDatabase();

  // 3) Baja y alta de los mensajes
  if (intencion.tipo === "baja") {
    await dataSource.query("UPDATE persona pe JOIN paciente pa ON pa.id_persona = pe.id_persona SET pe.whatsapp_acepta = NULL WHERE pa.id_paciente = ?", [paciente.pacienteId]);
    await guardarConversacion(celular, { sesionId: null, paso: "INICIO", opciones: null });
    await auditar(paciente, "BAJA_WHATSAPP", "WhatsApp", "Dejó de recibir mensajes por WhatsApp");
    return "Listo, no te vamos a mandar más recordatorios por WhatsApp. Vas a seguir recibiéndolos por email y en MemoPsy. Si cambiás de idea, escribí *ALTA*." + FIRMA;
  }
  if (intencion.tipo === "alta") {
    await dataSource.query("UPDATE persona pe JOIN paciente pa ON pa.id_persona = pe.id_persona SET pe.whatsapp_acepta = NOW() WHERE pa.id_paciente = ?", [paciente.pacienteId]);
    await auditar(paciente, "ALTA_WHATSAPP", "WhatsApp", "Aceptó recibir mensajes por WhatsApp");
    return "¡Listo! Vas a recibir los recordatorios de tus turnos por WhatsApp. Escribí *BAJA* cuando quieras dejar de recibirlos." + FIRMA;
  }

  const turno = await turnoActual(paciente, conversacion);
  if (!turno || turnoTerminado(turno)) {
    await guardarConversacion(celular, { sesionId: null, paso: "INICIO", opciones: null });
    return `Hola ${paciente.nombre}. No tenés turnos próximos. Si necesitás uno, comunicate con el consultorio.\n\nSi estás pasando un momento difícil, escribí *4*.` + FIRMA;
  }

  // 4) Respuestas que dependen de lo que se le preguntó antes
  if (conversacion.paso === "CONFIRMAR_CANCELACION" && conversacion.sesionId === Number(turno.id)) {
    if (intencion.tipo === "si" || (intencion.tipo === "numero" && intencion.valor === 1)) return cancelar(paciente, celular, turno);
    if (intencion.tipo === "no" || (intencion.tipo === "numero" && intencion.valor === 2)) {
      await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
      return `Perfecto, tu turno ${describirTurno(turno)} sigue en pie.` + FIRMA;
    }
  }
  if (conversacion.paso === "ELEGIR_HORARIO" && conversacion.opciones && intencion.tipo === "numero") {
    if (intencion.valor === 0) {
      await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
      return `Dejamos el turno como estaba: ${describirTurno(turno, "el")}.\n\n${MENU}` + FIRMA;
    }
    const elegido = conversacion.opciones[intencion.valor - 1];
    if (elegido && conversacion.sesionId === Number(turno.id)) return reprogramar(paciente, celular, turno, elegido);
  }

  // 5) Menú
  const opcion = intencion.tipo === "numero" ? intencion.valor : null;
  if (intencion.tipo === "confirmar" || opcion === 1) return confirmar(paciente, celular, turno);
  if (intencion.tipo === "cancelar" || opcion === 2) {
    await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "CONFIRMAR_CANCELACION", opciones: null });
    return `¿Querés cancelar tu turno ${describirTurno(turno)}?\nRespondé *SI* para cancelarlo o *NO* para mantenerlo.` + FIRMA;
  }
  if (intencion.tipo === "reprogramar" || opcion === 3) return ofrecerHorarios(paciente, celular, turno);

  await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
  return `Hola ${paciente.nombre} 👋 Tu próximo turno es ${describirTurno(turno, "el")}.\n\n${MENU}` + FIRMA;
}

async function confirmar(paciente: Paciente, celular: string, turno: SesionEntity): Promise<string> {
  const dataSource = await initializeDatabase();
  if (turno.estado?.nombre !== "Confirmada") {
    await cambiarEstadoTurno(dataSource, turno, "Confirmada");
    await notificarPsicologo(turno.psicologo.id, {
      tipo: "CONFIRMACION",
      titulo: "Turno confirmado",
      mensaje: `${nombreCompleto(paciente)} confirmó por WhatsApp el turno del ${fechaTurno(turno.fechaHoraInicio)}.`,
    });
    await auditar(paciente, "CONFIRMAR_WHATSAPP", "Sesiones", "El paciente confirmó su turno por WhatsApp", turno.id);
  }
  await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
  const enlace = turno.enlaceVideollamada && /^https?:\/\//i.test(turno.enlaceVideollamada)
    ? `\n\nEnlace de la videollamada: ${turno.enlaceVideollamada}`
    : "";
  return `¡Gracias, ${paciente.nombre}! Tu turno ${describirTurno(turno)} quedó confirmado.${enlace}` + FIRMA;
}

async function cancelar(paciente: Paciente, celular: string, turno: SesionEntity): Promise<string> {
  const dataSource = await initializeDatabase();
  const inicioAnterior = turno.fechaHoraInicio;
  await cambiarEstadoTurno(dataSource, turno, "Cancelada");
  await notificarCambioDeTurno({ sesionId: turno.id, tipo: "CANCELACION", inicioAnterior, usuarioQueCambia: paciente.usuarioId });
  await auditar(paciente, "CANCELAR_WHATSAPP", "Sesiones", "El paciente canceló su turno por WhatsApp", turno.id);
  await guardarConversacion(celular, { sesionId: null, paso: "INICIO", opciones: null });
  return `Listo, cancelamos tu turno del ${fechaTurno(inicioAnterior)}. Ya le avisamos a ${nombreCompleto(turno.psicologo?.persona)}.\nSi querés otro turno, comunicate con el consultorio.` + FIRMA;
}

async function ofrecerHorarios(paciente: Paciente, celular: string, turno: SesionEntity): Promise<string> {
  if (turno.fechaHoraInicio.getTime() - Date.now() < HORAS_ANTICIPACION * 60 * 60 * 1000) {
    await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
    return `Tu turno ${describirTurno(turno)} empieza en menos de ${HORAS_ANTICIPACION} horas, así que ya no se puede reprogramar por acá. Si no podés ir, respondé *2* para cancelarlo.` + FIRMA;
  }
  const dataSource = await initializeDatabase();
  const pts = await dataSource.getRepository(PacienteTieneSesionEntity).find({ where: { sesionId: turno.id } });
  const horarios = (await buscarHorariosLibres(dataSource, turno, pts.map((p) => String(p.pacienteId)))).slice(0, MAX_HORARIOS);
  if (horarios.length === 0) {
    await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
    return "Por ahora no hay horarios libres para reprogramar. Comunicate con el consultorio para buscar otro turno." + FIRMA;
  }
  await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "ELEGIR_HORARIO", opciones: horarios });
  const lista = horarios.map((h, i) => `*${i + 1}* ${fechaTurno(new Date(h.inicio))}`).join("\n");
  return `Estos son los horarios libres para mover tu turno ${describirTurno(turno)}:\n${lista}\n\nRespondé con el número que prefieras, o *0* para dejarlo como está.` + FIRMA;
}

async function reprogramar(paciente: Paciente, celular: string, turno: SesionEntity, elegido: { inicio: string; fin: string }): Promise<string> {
  const dataSource = await initializeDatabase();
  // Se vuelve a calcular: solo vale un horario que siga libre y habilitado
  const pts = await dataSource.getRepository(PacienteTieneSesionEntity).find({ where: { sesionId: turno.id } });
  const vigente = (await buscarHorariosLibres(dataSource, turno, pts.map((p) => String(p.pacienteId)))).find(
    (h) => new Date(h.inicio).getTime() === new Date(elegido.inicio).getTime(),
  );
  if (!vigente || turno.fechaHoraInicio.getTime() - Date.now() < HORAS_ANTICIPACION * 60 * 60 * 1000) {
    return (await ofrecerHorarios(paciente, celular, turno)).replace(/^/, "Ese horario ya no está disponible.\n\n");
  }
  const inicioAnterior = turno.fechaHoraInicio;
  try {
    await moverTurno(dataSource, turno, vigente);
  } catch (error) {
    if (error instanceof ErrorHorarioOcupado) {
      return (await ofrecerHorarios(paciente, celular, turno)).replace(/^/, "Ese horario se acaba de ocupar.\n\n");
    }
    throw error;
  }
  await notificarCambioDeTurno({ sesionId: turno.id, tipo: "REPROGRAMACION", inicioAnterior, usuarioQueCambia: paciente.usuarioId });
  await auditar(paciente, "REPROGRAMAR_WHATSAPP", "Sesiones", "El paciente reprogramó su turno por WhatsApp", turno.id);
  await guardarConversacion(celular, { sesionId: Number(turno.id), paso: "INICIO", opciones: null });
  return `¡Listo! Tu turno pasó al ${fechaTurno(new Date(vigente.inicio))} con ${nombreCompleto(turno.psicologo?.persona)}. Ya le avisamos.` + FIRMA;
}
