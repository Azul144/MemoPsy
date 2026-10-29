// Logo de MemoPsy: la letra psi (Ψ) con un punto dorado en lugar del trazo central.
// Los colores salen de las variables --logo-* de globals.css, así cambia solo con el modo claro u oscuro.

const TAMANOS = {
  sm: { icono: 32, texto: "text-xl" },
  md: { icono: 40, texto: "text-2xl" },
  lg: { icono: 48, texto: "text-3xl" },
} as const

export function IsotipoMemoPsy({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="16" fill="var(--logo-fondo)" />
      <path d="M18 18v8a14 14 0 0 0 28 0v-8" fill="none" stroke="var(--logo-trazo)" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 30v20" stroke="var(--logo-trazo)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="18" r="4.5" fill="var(--logo-punto)" />
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
