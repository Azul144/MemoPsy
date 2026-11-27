"use client";

// src/components/landing/Encabezado.tsx
// Sitio público: barra superior con el logo, los enlaces a cada sección y el acceso al sistema.
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import LogoMemoPsy from "@/components/comunes/LogoMemoPsy"

const links = [
  { href: "#lo-que-cambia", texto: "Beneficios" },
  { href: "#funciones", texto: "Funciones" },
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#seguridad", texto: "Seguridad" },
  { href: "#contacto", texto: "Contacto" },
];

export default function Encabezado() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">

        {/* Logo */}
        <a href="#inicio" className="flex shrink-0 items-center gap-3">
          <LogoMemoPsy tamano="md" />
        </a>

        {/* Menú de computadora */}
        <nav className="hidden gap-6 xl:flex 2xl:gap-8">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="whitespace-nowrap text-crema/85 transition-colors hover:text-dorado">
              {link.texto}
            </a>
          ))}
        </nav>

        {/* Botones de computadora */}
        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          <a href="#contacto" className="whitespace-nowrap rounded-full border border-primary/70 px-5 py-2 font-semibold text-dorado transition-colors hover:bg-primary/10">
            Pedir demostración
          </a>
          <Link href="/login" className="whitespace-nowrap rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
            Iniciar sesión
          </Link>
        </div>

        {/* Botón ☰ del celular */}
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-foreground/15 text-foreground xl:hidden"
        >
          {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menú desplegable del celular */}
      {abierto && (
        <nav className="flex flex-col border-t border-foreground/10 px-6 py-3 xl:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setAbierto(false)}
              className="py-3 text-foreground/90 hover:text-dorado"
            >
              {link.texto}
            </a>
          ))}
          <div className="mt-2 flex gap-3 pb-2">
            <a
              href="#contacto"
              onClick={() => setAbierto(false)}
              className="flex-1 rounded-full border border-primary py-3 text-center font-semibold text-dorado"
            >
              Demostración
            </a>
            <Link
              href="/login"
              className="flex-1 rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}