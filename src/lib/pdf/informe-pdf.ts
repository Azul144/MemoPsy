// src/lib/pdf/informe-pdf.ts
// RF 2.5 - Arma el PDF de una nota clínica en memoria. No se guarda en el servidor:
// la ruta lo genera cuando alguien lo pide y lo devuelve directamente.
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface DatosInformePdf {
  id: string;
  titulo: string;
  contenido: string;
  etiquetas?: string | null;
  fechaCreacion: Date | string;
  esPrivado: boolean;
  psicologo?: string | null;
  pacientes: { nombre: string; apellido: string; dni?: string | null }[];
}

export interface OpcionesPdf {
  // "psicologo": nota clínica completa. "paciente": versión para el paciente (sin datos internos)
  vista: "psicologo" | "paciente";
  generadoPor: string;
}

const A4 = { ancho: 595.28, alto: 841.89 };
const MARGEN = 56;
const ANCHO_UTIL = A4.ancho - MARGEN * 2;
const PIE = 64; // espacio reservado abajo para el pie de página

const VERDE = rgb(0x1d / 255, 0x34 / 255, 0x34 / 255);
const DORADO = rgb(0xf1 / 255, 0xc7 / 255, 0x7a / 255);
const GRIS = rgb(0.38, 0.42, 0.42);
const TEXTO = rgb(0.12, 0.14, 0.14);
const LINEA = rgb(0.85, 0.87, 0.87);

const formatoFecha = (fecha: Date | string, conHora = true) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(fecha));

// Las fuentes estándar de PDF solo traen caracteres latinos (incluye tildes, ñ, ¿ y ¡).
// Cualquier otro (emojis, etc.) se omite para que la generación no falle.
function soloImprimible(texto: string, fuente: PDFFont): string {
  const soportados = new Set(fuente.getCharacterSet());
  return Array.from(texto.replace(/\t/g, "    "))
    .filter((c) => c === "\n" || soportados.has(c.codePointAt(0)!))
    .join("")
    .replace(/ {2,}/g, " ");
}

// Corta un texto en líneas que entren en el ancho disponible
function partirEnLineas(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split(/\r?\n/)) {
    if (parrafo.trim() === "") {
      lineas.push("");
      continue;
    }
    let actual = "";
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) {
        actual = prueba;
        continue;
      }
      if (actual) lineas.push(actual);
      // Palabra más larga que el renglón (por ejemplo un enlace): se corta por letras
      let resto = palabra;
      while (fuente.widthOfTextAtSize(resto, tam) > ancho) {
        let corte = resto.length;
        while (corte > 1 && fuente.widthOfTextAtSize(resto.slice(0, corte), tam) > ancho) corte--;
        lineas.push(resto.slice(0, corte));
        resto = resto.slice(corte);
      }
      actual = resto;
    }
    lineas.push(actual);
  }
  return lineas;
}

export async function generarPdfInforme(datos: DatosInformePdf, opciones: OpcionesPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const esPsicologo = opciones.vista === "psicologo";
  const tituloDocumento = esPsicologo ? "Nota clínica" : "Informe para el paciente";

  pdf.setTitle(`${tituloDocumento} #${datos.id} - MemoPsy`);
  pdf.setAuthor(datos.psicologo ?? "MemoPsy");
  pdf.setCreator("MemoPsy");
  pdf.setProducer("MemoPsy");

  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  try {
    logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "memopsy-logo.png")));
  } catch {
    logo = null; // sin logo, el PDF sale igual
  }

  let pagina: PDFPage = pdf.addPage([A4.ancho, A4.alto]);
  let y = A4.alto - MARGEN;

  const escribir = (texto: string, x: number, alto: number, tam: number, fuente: PDFFont, color = TEXTO) =>
    pagina.drawText(soloImprimible(texto, fuente), { x, y: alto, size: tam, font: fuente, color });

  const nuevaPagina = () => {
    pagina = pdf.addPage([A4.ancho, A4.alto]);
    y = A4.alto - MARGEN;
  };
  const asegurarEspacio = (alto: number) => {
    if (y - alto < MARGEN + PIE) nuevaPagina();
  };

  // ---- Membrete ----
  if (logo) {
    const alto = 46;
    const ancho = (logo.width / logo.height) * alto;
    pagina.drawImage(logo, { x: MARGEN, y: y - alto + 6, width: ancho, height: alto });
  }
  const xMembrete = MARGEN + (logo ? 50 : 0);
  escribir("MemoPsy", xMembrete, y - 14, 20, negrita, VERDE);
  escribir(tituloDocumento, xMembrete, y - 32, 11, normal, GRIS);
  const etiquetaId = `N.º ${datos.id}`;
  escribir(etiquetaId, A4.ancho - MARGEN - negrita.widthOfTextAtSize(etiquetaId, 10), y - 14, 10, negrita, GRIS);
  y -= 50;
  pagina.drawRectangle({ x: MARGEN, y, width: ANCHO_UTIL, height: 3, color: DORADO });
  y -= 30;

  // ---- Título ----
  for (const linea of partirEnLineas(soloImprimible(datos.titulo, negrita), negrita, 16, ANCHO_UTIL)) {
    asegurarEspacio(22);
    escribir(linea, MARGEN, y, 16, negrita, VERDE);
    y -= 22;
  }
  y -= 6;

  // ---- Ficha ----
  const pacientes = datos.pacientes
    .map((p) => `${p.nombre} ${p.apellido}${p.dni ? ` (DNI ${p.dni})` : ""}`)
    .join(", ");
  const ficha: [string, string][] = [
    ["Fecha", formatoFecha(datos.fechaCreacion)],
    ["Profesional", datos.psicologo ?? "-"],
    [datos.pacientes.length > 1 ? "Pacientes" : "Paciente", pacientes || "-"],
  ];
  if (esPsicologo) {
    ficha.push(["Privacidad", datos.esPrivado ? "Privada (solo el profesional)" : "Compartida con el paciente"]);
  }
  if (datos.etiquetas?.trim()) {
    ficha.push(["Etiquetas", datos.etiquetas.split(",").map((e) => e.trim()).filter(Boolean).join(" · ")]);
  }

  const anchoRotulo = 92;
  for (const [rotulo, valor] of ficha) {
    const lineas = partirEnLineas(soloImprimible(valor, normal), normal, 10.5, ANCHO_UTIL - anchoRotulo);
    asegurarEspacio(lineas.length * 15 + 4);
    escribir(rotulo, MARGEN, y, 10.5, negrita, GRIS);
    lineas.forEach((l, i) => escribir(l, MARGEN + anchoRotulo, y - i * 15, 10.5, normal));
    y -= lineas.length * 15 + 4;
  }

  y -= 10;
  pagina.drawLine({ start: { x: MARGEN, y }, end: { x: A4.ancho - MARGEN, y }, thickness: 0.8, color: LINEA });
  y -= 26;

  // ---- Contenido ----
  asegurarEspacio(40);
  escribir("Contenido", MARGEN, y, 12, negrita, VERDE);
  y -= 22;
  for (const linea of partirEnLineas(soloImprimible(datos.contenido, normal), normal, 11, ANCHO_UTIL)) {
    asegurarEspacio(16);
    if (linea) escribir(linea, MARGEN, y, 11, normal);
    y -= 16;
  }

  // ---- Pie en todas las páginas ----
  const paginas = pdf.getPages();
  const aviso = esPsicologo
    ? "Documento confidencial. Contiene datos de salud protegidos por la Ley 25.326 y la Ley 26.529."
    : "Documento personal del paciente. Datos de salud protegidos por la Ley 25.326 y la Ley 26.529.";
  const generado = `Generado el ${formatoFecha(new Date())} por ${opciones.generadoPor}`;
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: MARGEN + 26 }, end: { x: A4.ancho - MARGEN, y: MARGEN + 26 }, thickness: 0.6, color: LINEA });
    p.drawText(soloImprimible(aviso, normal), { x: MARGEN, y: MARGEN + 12, size: 8, font: normal, color: GRIS });
    p.drawText(soloImprimible(generado, normal), { x: MARGEN, y: MARGEN, size: 8, font: normal, color: GRIS });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(numero, { x: A4.ancho - MARGEN - normal.widthOfTextAtSize(numero, 8), y: MARGEN, size: 8, font: normal, color: GRIS });
  });

  return pdf.save();
}

// ---------------------------------------------------------------------------
// RF 2.4 / RF 2.5 - PDF del informe de seguimiento para el paciente.
// Mismo membrete que la nota clínica, pero solo con lo que el psicólogo compartió.

export interface DatosSeguimientoPdf {
  id: string;
  fechaSesion: Date | string;
  psicologo?: string | null;
  pacientes: string[];
  resumen: string;
  actividades: { descripcion: string; respuesta: "HECHA" | "NO_PUDE" | null; comentario: string | null }[];
  pautas?: string | null;
  avances?: string | null;
  proximaSesion?: Date | string | null;
}

export async function generarPdfSeguimiento(datos: DatosSeguimientoPdf, generadoPor: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`Informe de seguimiento #${datos.id} - MemoPsy`);
  pdf.setAuthor(datos.psicologo ?? "MemoPsy");
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
  const asegurarEspacio = (alto: number) => {
    if (y - alto < MARGEN + PIE) {
      pagina = pdf.addPage([A4.ancho, A4.alto]);
      y = A4.alto - MARGEN;
    }
  };
  // Párrafo con sangría opcional; devuelve cuántas líneas ocupó
  const parrafo = (texto: string, x = MARGEN, tam = 11, fuente = normal, color = TEXTO) => {
    for (const linea of partirEnLineas(soloImprimible(texto, fuente), fuente, tam, A4.ancho - MARGEN - x)) {
      asegurarEspacio(16);
      if (linea) escribir(linea, x, y, tam, fuente, color);
      y -= 16;
    }
  };
  const seccion = (titulo: string) => {
    y -= 8;
    asegurarEspacio(48);
    escribir(titulo, MARGEN, y, 12.5, negrita, VERDE);
    y -= 6;
    pagina.drawRectangle({ x: MARGEN, y, width: 28, height: 2, color: DORADO });
    y -= 18;
  };

  // ---- Membrete ----
  if (logo) {
    const alto = 46;
    const ancho = (logo.width / logo.height) * alto;
    pagina.drawImage(logo, { x: MARGEN, y: y - alto + 6, width: ancho, height: alto });
  }
  const xMembrete = MARGEN + (logo ? 50 : 0);
  escribir("MemoPsy", xMembrete, y - 14, 20, negrita, VERDE);
  escribir("Informe de seguimiento", xMembrete, y - 32, 11, normal, GRIS);
  const etiquetaId = `N.º ${datos.id}`;
  escribir(etiquetaId, A4.ancho - MARGEN - negrita.widthOfTextAtSize(etiquetaId, 10), y - 14, 10, negrita, GRIS);
  y -= 50;
  pagina.drawRectangle({ x: MARGEN, y, width: ANCHO_UTIL, height: 3, color: DORADO });
  y -= 28;

  // ---- Encabezado ----
  const ficha: [string, string][] = [
    [datos.pacientes.length > 1 ? "Pacientes" : "Paciente", datos.pacientes.join(", ") || "-"],
    ["Profesional", datos.psicologo ?? "-"],
    ["Sesión del", formatoFecha(datos.fechaSesion, false)],
    ["Próxima sesión", datos.proximaSesion ? formatoFecha(datos.proximaSesion) : "A coordinar"],
  ];
  const anchoRotulo = 100;
  for (const [rotulo, valor] of ficha) {
    const lineas = partirEnLineas(soloImprimible(valor, normal), normal, 10.5, ANCHO_UTIL - anchoRotulo);
    asegurarEspacio(lineas.length * 15 + 4);
    escribir(rotulo, MARGEN, y, 10.5, negrita, GRIS);
    lineas.forEach((l, i) => escribir(l, MARGEN + anchoRotulo, y - i * 15, 10.5, normal));
    y -= lineas.length * 15 + 4;
  }
  y -= 6;
  pagina.drawLine({ start: { x: MARGEN, y }, end: { x: A4.ancho - MARGEN, y }, thickness: 0.8, color: LINEA });
  y -= 14;

  // ---- Secciones ----
  seccion("Lo que trabajamos en la sesión");
  parrafo(datos.resumen);

  if (datos.actividades.length > 0) {
    seccion("Actividades hasta la próxima sesión");
    datos.actividades.forEach((a, i) => {
      asegurarEspacio(18);
      escribir(`${i + 1}.`, MARGEN, y, 11, negrita, VERDE);
      parrafo(a.descripcion, MARGEN + 18);
      // Si ya respondió, se deja constancia debajo; si no, queda la casilla para marcar en papel
      const estado = a.respuesta === "HECHA" ? "La hice" : a.respuesta === "NO_PUDE" ? "No pude" : "[  ] La hice    [  ] No pude";
      parrafo(a.comentario ? `${estado} · Tu comentario: ${a.comentario}` : estado, MARGEN + 18, 9.5, normal, GRIS);
      y -= 4;
    });
  }

  if (datos.pautas?.trim()) {
    seccion("Pautas y recomendaciones");
    parrafo(datos.pautas);
  }

  if (datos.avances?.trim()) {
    seccion("Avances y logros");
    parrafo(datos.avances);
  }

  // ---- Pie ----
  const paginas = pdf.getPages();
  const aviso = "Documento personal del paciente. Datos de salud protegidos por la Ley 25.326 y la Ley 26.529.";
  const generado = `Generado el ${formatoFecha(new Date())} por ${generadoPor}`;
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: MARGEN + 26 }, end: { x: A4.ancho - MARGEN, y: MARGEN + 26 }, thickness: 0.6, color: LINEA });
    p.drawText(soloImprimible(aviso, normal), { x: MARGEN, y: MARGEN + 12, size: 8, font: normal, color: GRIS });
    p.drawText(soloImprimible(generado, normal), { x: MARGEN, y: MARGEN, size: 8, font: normal, color: GRIS });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(numero, { x: A4.ancho - MARGEN - normal.widthOfTextAtSize(numero, 8), y: MARGEN, size: 8, font: normal, color: GRIS });
  });

  return pdf.save();
}
