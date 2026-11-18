// Genera los archivos del logo de MemoPsy a partir de la misma figura del componente LogoMemoPsy:
//   src/app/icon.svg           ícono de la pestaña del navegador
//   src/app/apple-icon.png     ícono al guardar el sitio en la pantalla del celular (180 px)
//   public/memopsy-logo.png    logo de los PDF (512 px)
// Usa los colores del modo claro (cuadrado petróleo), que se distinguen sobre fondos claros y oscuros.
//   node scripts/generar-logo.mjs
import { writeFileSync } from "node:fs"
import sharp from "sharp"

const C = { fondo: "#1D4A48", hoja: "#FFFFFF", trazo: "#1D4A48", onda1: "#1D4A48", onda2: "#D9A441" }

const anillos = [19, 32, 45]
  .map((y) => `<circle cx="12.5" cy="${y}" r="3.4" fill="${C.hoja}"/><circle cx="12.5" cy="${y}" r="1.7" fill="${C.fondo}"/>`)
  .join("")
const ondas = [
  [27, 43.5, 49.5, C.onda2],
  [32, 41, 52, C.onda1],
  [37, 42.5, 50.5, C.onda2],
  [42, 44.5, 48.5, C.onda1],
]
  .map(([x, y1, y2, c]) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/>`)
  .join("")

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="15" fill="${C.fondo}"/>` +
  `<rect x="12" y="7" width="41" height="50" rx="6" fill="${C.hoja}"/>` +
  anillos +
  `<path d="M26 13v8.5a8 8 0 0 0 16 0V13M34 9.5v28" fill="none" stroke="${C.trazo}" stroke-width="4.2"/>` +
  ondas +
  `</svg>`

writeFileSync("src/app/icon.svg", svg)
await sharp(Buffer.from(svg), { density: 600 }).resize(180, 180).png().toFile("src/app/apple-icon.png")
await sharp(Buffer.from(svg), { density: 1200 }).resize(512, 512).png().toFile("public/memopsy-logo.png")
console.log("Logo generado: icon.svg, apple-icon.png y memopsy-logo.png")
