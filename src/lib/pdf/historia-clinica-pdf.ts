// src/lib/pdf/historia-clinica-pdf.ts
// Arma en memoria el PDF de la historia clínica completa (Ley 26.529, art. 12: cronológica,
// foliada y completa): identificación, admisión, evolución (las notas clínicas en orden de fecha)
// y cierre. No se guarda en el servidor: la ruta lo genera cuando el psicólogo lo pide.
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import {
  A4,
  ANCHO_UTIL,
  DORADO,
  GRIS,
  LINEA,
  MARGEN,
  PIE,
  TEXTO,
  VERDE,
  formatoFecha,
  partirEnLineas,
  soloImprimible,
} from "./informe-pdf";
import { APARTADOS_ADMISION, CAMPOS_IDENTIFICACION, NOMBRE_MOTIVO_CIERRE, edadEn } from "@/lib/historia-clinica/apartados";
import type { HistoriaCompleta } from "@/lib/historia-clinica/datos";

// Las fechas sin hora (AAAA-MM-DD) se muestran tal cual, sin pasar por zonas horarias
const fechaDia = (fecha: string | null | undefined) => (fecha ? fecha.slice(0, 10).split("-").reverse().join("/") : "-");

export async function generarPdfHistoriaClinica(datos: HistoriaCompleta, generadoPor: string): Promise<Uint8Array> {
  const historia = datos.historia;
  if (!historia) throw new Error("El paciente no tiene historia clínica");

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const nombrePaciente = `${datos.paciente.apellido}, ${datos.paciente.nombre}`;

  pdf.setTitle(`Historia clínica - ${nombrePaciente} - MemoPsy`);
  pdf.setAuthor(datos.psicologo.nombre || "MemoPsy");
  pdf.setCreator("MemoPsy");
  pdf.setProducer("MemoPsy");

  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  try {
    logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "memopsy-logo.png")));
  } catch {
    logo = null;
  }

  let pagina: PDFPage = pdf.addPage([A4.ancho, A4.alto]);
  let y = A4.alto - MARGEN;
  const escribir = (texto: string, x: number, alto: number, tam: number, fuente: PDFFont, color = TEXTO) =>
    pagina.drawText(soloImprimible(texto, fuente), { x, y: alto, size: tam, font: fuente, color });

  // Las páginas siguientes llevan un encabezado corto con el paciente, por si se separan las hojas
  const nuevaPagina = () => {
    pagina = pdf.addPage([A4.ancho, A4.alto]);
    y = A4.alto - MARGEN;
    escribir(`Historia clínica · ${nombrePaciente} · DNI ${datos.paciente.dni}`, MARGEN, y, 8.5, normal, GRIS);
    y -= 8;
    pagina.drawLine({ start: { x: MARGEN, y }, end: { x: A4.ancho - MARGEN, y }, thickness: 0.6, color: LINEA });
    y -= 22;
  };
  const asegurarEspacio = (alto: number) => {
    if (y - alto < MARGEN + PIE) nuevaPagina();
  };
  const parrafo = (texto: string, x = MARGEN, tam = 10.5, fuente = normal, color = TEXTO) => {
    for (const linea of partirEnLineas(soloImprimible(texto, fuente), fuente, tam, A4.ancho - MARGEN - x)) {
      asegurarEspacio(15);
      if (linea) escribir(linea, x, y, tam, fuente, color);
      y -= 15;
    }
  };
  const seccion = (titulo: string) => {
    y -= 10;
    asegurarEspacio(50);
    escribir(titulo, MARGEN, y, 12.5, negrita, VERDE);
    y -= 6;
    pagina.drawRectangle({ x: MARGEN, y, width: 28, height: 2, color: DORADO });
    y -= 18;
  };
  const subtitulo = (titulo: string) => {
    y -= 4;
    asegurarEspacio(34);
    escribir(titulo, MARGEN, y, 10.5, negrita, VERDE);
    y -= 15;
  };
  const ficha = (filas: [string, string][], anchoRotulo = 130) => {
    for (const [rotulo, valor] of filas) {
      const lineas = partirEnLineas(soloImprimible(valor, normal), normal, 10, ANCHO_UTIL - anchoRotulo);
      asegurarEspacio(lineas.length * 14 + 3);
      escribir(rotulo, MARGEN, y, 10, negrita, GRIS);
      lineas.forEach((l, i) => escribir(l, MARGEN + anchoRotulo, y - i * 14, 10, normal));
      y -= lineas.length * 14 + 3;
    }
  };

  // ---- Membrete ----
  if (logo) {
    const alto = 46;
    const ancho = (logo.width / logo.height) * alto;
    pagina.drawImage(logo, { x: MARGEN, y: y - alto + 6, width: ancho, height: alto });
  }
  const xMembrete = MARGEN + (logo ? 50 : 0);
  escribir("MemoPsy", xMembrete, y - 14, 20, negrita, VERDE);
  escribir("Historia clínica psicológica", xMembrete, y - 32, 11, normal, GRIS);
  const etiquetaId = `HC N.º ${historia.id}`;
  escribir(etiquetaId, A4.ancho - MARGEN - negrita.widthOfTextAtSize(etiquetaId, 10), y - 14, 10, negrita, GRIS);
  y -= 50;
  pagina.drawRectangle({ x: MARGEN, y, width: ANCHO_UTIL, height: 3, color: DORADO });
  y -= 30;

  // ---- 1. Identificación ----
  seccion("1. Datos de identificación");
  const nacimiento = datos.paciente.fechaNacimiento;
  const extra = historia as unknown as Record<string, string | null>;
  ficha([
    ["Paciente", nombrePaciente],
    ["DNI", datos.paciente.dni],
    ["Fecha de nacimiento", nacimiento ? `${fechaDia(nacimiento)} (${edadEn(nacimiento, historia.fechaAdmision)} años a la admisión)` : "-"],
    ["Teléfono", datos.paciente.telefono || "-"],
    ["Obra social", datos.paciente.obraSocial || "-"],
    ...CAMPOS_IDENTIFICACION.map(({ campo, titulo }) => [titulo, extra[campo] || "-"] as [string, string]),
    ["Fecha de admisión", fechaDia(historia.fechaAdmision)],
    [
      "Profesional tratante",
      [datos.psicologo.nombre, datos.psicologo.especialidad, datos.psicologo.licencia].filter(Boolean).join(" · ") || "-",
    ],
  ]);

  // ---- 2. Admisión ----
  seccion("2. Admisión");
  for (const { campo, titulo } of APARTADOS_ADMISION) {
    subtitulo(titulo);
    const valor = extra[campo];
    if (valor?.trim()) parrafo(valor);
    else parrafo("Sin datos registrados.", MARGEN, 10, normal, GRIS);
    y -= 4;
  }
  subtitulo("Consentimiento informado");
  parrafo(
    historia.consentimientoInformado
      ? `Otorgado por el paciente o su representante el ${fechaDia(historia.fechaConsentimiento ?? historia.fechaAdmision)}.`
      : "No registrado.",
  );

  // ---- 3. Evolución ----
  seccion("3. Evolución");
  if (datos.evoluciones.length === 0) {
    parrafo("Todavía no hay sesiones registradas.", MARGEN, 10, normal, GRIS);
  }
  for (const nota of datos.evoluciones) {
    asegurarEspacio(48);
    escribir(formatoFecha(nota.fecha), MARGEN, y, 10, negrita, GRIS);
    y -= 15;
    parrafo(nota.titulo, MARGEN, 10.5, negrita, VERDE);
    parrafo(nota.contenido);
    y -= 6;
    asegurarEspacio(10);
    pagina.drawLine({ start: { x: MARGEN, y: y + 4 }, end: { x: A4.ancho - MARGEN, y: y + 4 }, thickness: 0.4, color: LINEA });
    y -= 8;
  }

  // ---- 4. Cierre ----
  // El cierre y la firma van juntos: si no entran en la hoja, pasan los dos a la siguiente
  const altoCierre = historia.fechaCierre ? 230 : 130;
  if (y - altoCierre < MARGEN + PIE) nuevaPagina();
  seccion("4. Cierre del tratamiento");
  if (historia.fechaCierre) {
    ficha([
      ["Fecha de cierre", fechaDia(historia.fechaCierre)],
      ["Motivo", historia.motivoCierre ? NOMBRE_MOTIVO_CIERRE[historia.motivoCierre] : "-"],
    ]);
    subtitulo("Epicrisis");
    parrafo(historia.epicrisis?.trim() || "Sin datos registrados.");
  } else {
    parrafo("Tratamiento en curso.", MARGEN, 10.5, normal, GRIS);
  }

  // ---- Firma ----
  asegurarEspacio(80);
  y -= 50;
  const anchoFirma = 200;
  const xFirma = A4.ancho - MARGEN - anchoFirma;
  pagina.drawLine({ start: { x: xFirma, y }, end: { x: A4.ancho - MARGEN, y }, thickness: 0.8, color: TEXTO });
  y -= 13;
  escribir("Firma y sello del profesional", xFirma, y, 9, normal, GRIS);
  y -= 12;
  if (datos.psicologo.nombre) escribir(datos.psicologo.nombre, xFirma, y, 9, negrita, GRIS);

  // ---- Pie con folio en todas las hojas ----
  const paginas = pdf.getPages();
  const aviso = "Documento confidencial. Datos de salud protegidos por la Ley 25.326 y la Ley 26.529.";
  const generado = `Generado el ${formatoFecha(new Date())} por ${generadoPor}`;
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: MARGEN + 26 }, end: { x: A4.ancho - MARGEN, y: MARGEN + 26 }, thickness: 0.6, color: LINEA });
    p.drawText(soloImprimible(aviso, normal), { x: MARGEN, y: MARGEN + 12, size: 8, font: normal, color: GRIS });
    p.drawText(soloImprimible(generado, normal), { x: MARGEN, y: MARGEN, size: 8, font: normal, color: GRIS });
    const folio = `Folio ${i + 1} de ${paginas.length}`;
    p.drawText(folio, { x: A4.ancho - MARGEN - negrita.widthOfTextAtSize(folio, 8.5), y: MARGEN, size: 8.5, font: negrita, color: GRIS });
  });

  return pdf.save();
}
