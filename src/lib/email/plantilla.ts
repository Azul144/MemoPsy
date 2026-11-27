// src/lib/email/plantilla.ts
// Marco común de los emails de MemoPsy, en modo claro: fondo gris suave, tarjeta blanca, logo arriba,
// botón petróleo (el color del logo) y pie gris. Está armado con tablas y estilos en línea porque
// Gmail, Outlook y los celulares ignoran las hojas de estilo y el diseño con flex o grid.

const PETROLEO = "#1D4A48";
const DORADO = "#C9962F";
const TEXTO = "#2B3A39";
const SUAVE = "#5F6F6D";

function escapar(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export interface Email {
  // Texto corto que algunos correos muestran al lado del asunto, antes de abrirlo
  resumen: string;
  titulo: string;
  // Párrafos o HTML simple ya armado (con datos escapados)
  cuerpo: string;
  boton?: { texto: string; enlace: string };
  // Letra chica debajo del botón
  notas?: string[];
}

export function sitioMemoPsy(): string {
  return (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
}

export function parrafo(html: string): string {
  return `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${TEXTO};">${html}</p>`;
}

// Lista con tildes, para enumerar lo que la persona puede hacer
export function lista(items: string[]): string {
  const filas = items
    .map(
      (i) => `
        <tr>
          <td valign="top" style="width: 28px; padding: 4px 0; color: ${DORADO}; font-size: 16px; font-weight: bold;">✓</td>
          <td style="padding: 4px 0; font-size: 15px; line-height: 1.5; color: ${TEXTO};">${escapar(i)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">${filas}</table>`;
}

// Recuadro con datos en renglones (etiqueta a la izquierda, valor a la derecha), p. ej. los del turno
export function recuadroDatos(filas: [string, string][]): string {
  const renglones = filas
    .map(
      ([etiqueta, valor], i) => `
        <tr>
          <td style="padding: 10px 16px; font-size: 14px; color: ${SUAVE}; white-space: nowrap;${i > 0 ? " border-top: 1px solid #E1E7E6;" : ""}">${escapar(etiqueta)}</td>
          <td style="padding: 10px 16px; font-size: 15px; font-weight: bold; color: ${TEXTO};${i > 0 ? " border-top: 1px solid #E1E7E6;" : ""}">${escapar(valor)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px; background: #F6F8F7; border: 1px solid #E1E7E6; border-radius: 12px;">${renglones}</table>`;
}

export function marcoEmail({ resumen, titulo, cuerpo, boton, notas = [] }: Email): string {
  const sitio = sitioMemoPsy();
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapar(titulo)}</title></head>
<body style="margin: 0; padding: 0; background: #F2F5F4;">
  <span style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapar(resumen)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F2F5F4; padding: 32px 12px; font-family: 'Segoe UI', Arial, sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
        <!-- Logo -->
        <tr><td align="center" style="padding: 0 0 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right: 10px;"><img src="${sitio}/memopsy-logo.png" width="40" height="40" alt="" style="display: block; border-radius: 10px;"></td>
            <td style="font-size: 24px; font-weight: bold; color: ${PETROLEO}; letter-spacing: -0.3px;">Memo<span style="color: ${DORADO};">Psy</span></td>
          </tr></table>
        </td></tr>
        <!-- Tarjeta -->
        <tr><td style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E7E6; padding: 36px 36px 28px;">
          <div style="height: 4px; width: 48px; background: ${DORADO}; border-radius: 4px; margin: 0 0 20px;"></div>
          <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${PETROLEO};">${escapar(titulo)}</h1>
          ${cuerpo}
          ${
            boton
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 24px;"><tr>
                  <td style="background: ${PETROLEO}; border-radius: 999px;">
                    <a href="${boton.enlace}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none;">${escapar(boton.texto)}</a>
                  </td>
                </tr></table>`
              : ""
          }
          ${notas
            .map((n) => `<p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: ${SUAVE};">${n}</p>`)
            .join("")}
        </td></tr>
        <!-- Pie -->
        <tr><td align="center" style="padding: 20px 12px 0; font-size: 12px; line-height: 1.5; color: ${SUAVE};">
          MemoPsy · Notas clínicas, agenda y seguimiento para consultorios de psicología.<br>
          Este correo es automático: no hace falta responderlo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
