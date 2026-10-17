"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#inicio", texto: "Home" },
  { href: "#funciones", texto: "Funciones Clave" },
  { href: "#testimonios", texto: "Testimonios" },
  { href: "#por-que", texto: "¿Por qué MemoPsy?" },
  { href: "#sobre-nosotros", texto: "Sobre nosotros" },
];

export default function Encabezado() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-3">
          <Image src="/assets/logopng.png" alt="Logo de MemoPsy" width={36} height={44} />
          <span className="text-2xl font-bold text-primary">MemoPsy</span>
        </a>

        {/* Menú de computadora */}
        <nav className="hidden gap-8 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-white/90 hover:text-primary">
              {link.texto}
            </a>
          ))}
        </nav>

        {/* Botones de computadora */}
        <div className="hidden items-center gap-3 lg:flex">
          <a href="#contacto" className="rounded-md border border-primary px-5 py-2 font-semibold text-primary">
            Agendar
          </a>
          <Link href="/login" className="rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground">
            Iniciar Sesión
          </Link>
        </div>

        {/* Botón ☰ del celular */}
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-white lg:hidden"
        >
          {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menú desplegable del celular */}
      {abierto && (
        <nav className="flex flex-col border-t border-white/10 px-6 py-3 lg:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setAbierto(false)}
              className="py-3 text-white/90 hover:text-primary"
            >
              {link.texto}
            </a>
          ))}
          <div className="mt-2 flex gap-3 pb-2">
            <a
              href="#contacto"
              onClick={() => setAbierto(false)}
              className="flex-1 rounded-md border border-primary py-3 text-center font-semibold text-primary"
            >
              Agendar
            </a>
            <Link
              href="/login"
              className="flex-1 rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
            >
              Iniciar Sesión
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}