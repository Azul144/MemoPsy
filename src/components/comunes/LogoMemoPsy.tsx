// Logo de MemoPsy: un cuaderno anillado con la letra psi (Ψ) y, debajo, las ondas de la voz (el dictado).
// Los colores salen de las variables --logo-* de globals.css, así cambia solo con el modo claro u oscuro.
// La misma figura está en src/app/icon.svg (pestaña del navegador), apple-icon.png y public/memopsy-logo.png
// (PDF), generados con scripts/generar-logo.mjs.

const TAMANOS = {
  xs: { icono: 38, texto: "text-xl" },
  sm: { icono: 48, texto: "text-2xl" },
  md: { icono: 56, texto: "text-3xl" },
  lg: { icono: 64, texto: "text-4xl" },
} as const

// Figura simplificada para que se lea aun en 32 px: hoja grande, tres anillos, Ψ gruesa y cuatro ondas
export function IsotipoMemoPsy({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="15" fill="var(--logo-fondo)" />
      {/* Hoja del cuaderno con los anillos */}
      <rect x="12" y="7" width="41" height="50" rx="6" fill="var(--logo-hoja)" />
      {[19, 32, 45].map((y) => (
        <g key={y}>
          <circle cx="12.5" cy={y} r="3.4" fill="var(--logo-hoja)" />
          <circle cx="12.5" cy={y} r="1.7" fill="var(--logo-fondo)" />
        </g>
      ))}
      {/* Ψ */}
      <path d="M26 13v8.5a8 8 0 0 0 16 0V13M34 9.5v28" fill="none" stroke="var(--logo-trazo)" strokeWidth="4.2" />
      {/* Ondas de la voz */}
      {[
        [27, 43.5, 49.5, "var(--logo-onda-2)"],
        [32, 41, 52, "var(--logo-onda-1)"],
        [37, 42.5, 50.5, "var(--logo-onda-2)"],
        [42, 44.5, 48.5, "var(--logo-onda-1)"],
      ].map(([x, y1, y2, color]) => (
        <line key={x} x1={x} y1={y1} x2={x} y2={y2} stroke={color as string} strokeWidth="3.6" strokeLinecap="round" />
      ))}
    </svg>
  )
}

export default function LogoMemoPsy({
  tamano = "sm",
  conNombre = true,
}: {
  tamano?: keyof typeof TAMANOS
  conNombre?: boolean
}) {
  const { icono, texto } = TAMANOS[tamano]
  return (
    <span className="flex items-center gap-3" aria-label="MemoPsy">
      <IsotipoMemoPsy size={icono} />
      {conNombre && (
        <span className={`titulo font-semibold tracking-tight ${texto}`} aria-hidden="true">
          <span style={{ color: "var(--logo-memo)" }}>Memo</span>
          <span style={{ color: "var(--logo-psy)" }}>Psy</span>
        </span>
      )}
    </span>
  )
}
