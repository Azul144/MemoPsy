// src/components/sistema/TarjetaAccion.tsx
// Tarjeta para entrar a una acción o módulo (la misma del panel de bienvenida).
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function TarjetaAccion({
  icono: Icono,
  titulo,
  descripcion,
  href,
  onClick,
  orden = 0,
  textoBoton = "Entrar",
}: {
  icono: React.ElementType;
  titulo: string;
  descripcion: string;
  href?: string;
  onClick?: () => void;
  orden?: number;
  textoBoton?: string;
}) {
  const clases =
    "entrar group flex h-full flex-col rounded-3xl border border-foreground/10 bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-black/30 focus-visible:outline-2 focus-visible:outline-primary";
  const contenido = (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 transition-colors group-hover:bg-primary">
        <Icono className="h-6 w-6 text-dorado transition-colors group-hover:text-primary-foreground" />
      </span>
      <span className="mt-5 text-xl font-semibold text-crema">{titulo}</span>
      <span className="mt-1 flex-1 text-crema/65">{descripcion}</span>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-dorado">
        {textoBoton}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </>
  );
  const estilo = { animationDelay: `${0.15 + orden * 0.07}s` };
  if (href) {
    return (
      <Link href={href} className={clases} style={estilo}>
        {contenido}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clases} style={estilo}>
      {contenido}
    </button>
  );
}
