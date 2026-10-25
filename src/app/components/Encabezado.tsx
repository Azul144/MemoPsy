"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import LogoMemoPsy from "@/components/LogoMemoPsy"

const links = [
  { href: "#funciones", texto: "Funciones" },
  { href: "#modulos", texto: "Módulos" },
  { href: "#testimonios", texto: "Testimonios" },
  { href: "#por-que", texto: "¿Por qué MemoPsy?" },
  { href: "#contacto", texto: "Contacto" },
];

export default function Encabezado() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-3">
          <LogoMemoPsy tamano="md" />
        </a>

        {/* Menú de computadora */}
        <nav className="hidden gap-8 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-crema/85 transition-colors hover:text-dorado">
              {link.texto}
            </a>
          ))}
        </nav>

        {/* Botones de computadora */}
        <div className="hidden items-center gap-3 lg:flex">
          <a href="#contacto" className="rounded-full border border-primary/70 px-5 py-2 font-semibold text-dorado transition-colors hover:bg-primary/10">
            Pedir demostración
          </a>
          <Link href="/login" className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
            Iniciar sesión
          </Link>
        </div>

        {/* Botón ☰ del celular */}
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-foreground/15 text-foreground lg:hidden"
        >
          {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menú desplegable del celular */}
      {abierto && (
        <nav className="flex flex-col border-t border-foreground/10 px-6 py-3 lg:hidden">
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