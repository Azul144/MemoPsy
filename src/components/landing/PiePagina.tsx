// src/components/landing/PiePagina.tsx
// Sitio público: pie de página con accesos directos, normas y datos de contacto.
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck, FileLock2, KeyRound } from "lucide-react";
import LogoMemoPsy from "@/components/comunes/LogoMemoPsy"

const contacto = [
  { icono: MapPin, texto: "Av. 25 de Mayo 450, Oficina 2, Formosa (P3600)" },
  { icono: Phone, texto: "+54 370 400-1234" },
  { icono: Mail, texto: "contacto@memopsy.com", href: "mailto:contacto@memopsy.com" },
];

// Enlaces en dos grupos cortos
const grupos = [
  {
    titulo: "Producto",
    enlaces: [
      { href: "#funciones", texto: "Funciones" },
      { href: "#modulos", texto: "Módulos" },
      { href: "#testimonios", texto: "Testimonios" },
      { href: "#por-que", texto: "¿Por qué MemoPsy?" },
    ],
  },
  {
    titulo: "Empezar",
    enlaces: [
      { href: "#contacto", texto: "Pedir una demostración" },
      { href: "/login", texto: "Iniciar sesión" },
    ],
  },
];

// Sellos de confianza debajo del lema
const sellos = [
  { icono: ShieldCheck, texto: "Ley 25.326" },
  { icono: FileLock2, texto: "Ley 26.529" },
  { icono: KeyRound, texto: "Verificación en dos pasos" },
];

export default function PiePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer id="sobre-nosotros" className="relative overflow-hidden border-t border-foreground/10 bg-card px-6">
      <div className="relative mx-auto grid max-w-6xl gap-12 pt-20 pb-10 lg:grid-cols-[1.2fr_1.2fr_1fr] lg:gap-16">

        {/* Marca */}
        <div>
          <a href="#inicio" className="inline-flex">
            <LogoMemoPsy tamano="md" />
          </a>
          <p className="titulo mt-6 max-w-sm text-3xl text-crema sm:text-4xl">La memoria del consultorio</p>
          <p className="mt-4 max-w-sm text-crema/65">
            Notas clínicas, agenda y seguimiento de cada paciente en un sistema web seguro, pensado
            para la Provincia de Formosa.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {sellos.map((s) => (
              <li
                key={s.texto}
                className="flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-1.5 text-xs text-crema/75"
              >
                <s.icono className="h-3.5 w-3.5 text-salvia" />
                {s.texto}
              </li>
            ))}
          </ul>
        </div>

        {/* Enlaces */}
        <div className="grid grid-cols-2 gap-8">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <h2 className="text-xs font-semibold tracking-widest text-dorado uppercase">{g.titulo}</h2>
              <ul className="mt-5 space-y-3 text-crema/75">
                {g.enlaces.map((e) => (
                  <li key={e.texto} className="lg:whitespace-nowrap">
                    {e.href.startsWith("/") ? (
                      <Link href={e.href} className="transition-colors hover:text-dorado">{e.texto}</Link>
                    ) : (
                      <a href={e.href} className="transition-colors hover:text-dorado">{e.texto}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contacto */}
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-dorado uppercase">Contacto</h2>
          <ul className="mt-5 space-y-4">
            {contacto.map((c) => (
              <li key={c.texto} className="flex items-center gap-3 text-crema/75">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <c.icono className="h-4 w-4 text-dorado" />
                </span>
                {c.href ? (
                  <a href={c.href} className="transition-colors hover:text-dorado">{c.texto}</a>
                ) : (
                  <span>{c.texto}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-2 border-t border-foreground/10 py-6 text-sm text-crema/50 md:flex-row md:justify-between">
        <span>© {anio} MemoPsy</span>
        <span>Trabajo Integrador Final - Universidad de la Cuenca del Plata</span>
      </div>
    </footer>
  );
}
