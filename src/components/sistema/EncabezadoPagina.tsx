// src/components/sistema/EncabezadoPagina.tsx
// Encabezado de las pantallas internas: botón para volver, título, descripción
// y luces que se mueven de fondo (igual que el saludo del panel de bienvenida).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FondoAnimado from "@/components/FondoAnimado";

export default function EncabezadoPagina({
  titulo,
  descripcion,
  volverA = "/welcome",
  textoVolver = "Volver al inicio",
  children,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  volverA?: string;
  textoVolver?: string;
  children?: React.ReactNode; // botones extra a la derecha
}) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-foreground/10 bg-card px-8 py-9 text-left sm:px-10">
      <FondoAnimado />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link
            href={volverA}
            className="entrar inline-flex items-center gap-2 text-sm text-crema/65 transition-colors hover:text-dorado"
          >
            <ArrowLeft className="h-4 w-4" />
            {textoVolver}
          </Link>
          <h1 className="titulo entrar mt-3 text-3xl text-crema sm:text-4xl" style={{ animationDelay: "0.08s" }}>
            {titulo}
          </h1>
          {descripcion && (
            <p className="entrar mt-2 max-w-2xl text-crema/70" style={{ animationDelay: "0.16s" }}>
              {descripcion}
            </p>
          )}
        </div>
        {children && <div className="entrar flex flex-wrap gap-3" style={{ animationDelay: "0.2s" }}>{children}</div>}
      </div>
    </section>
  );
}
