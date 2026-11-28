// src/components/sistema/BarraSistema.tsx
// Barra superior compartida por todas las pantallas internas del sistema:
// logo, nombre de la persona, su foto de perfil (o sus iniciales) y un menú con los módulos que tiene permitidos.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, HeartHandshake, HomeIcon, Loader2, LogOut, Menu, UserRound, X } from "lucide-react";
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import { MODULOS_DISPONIBLES, modulosParaUsuario } from "@/config/modulos";
import CampanaNotificaciones from "./CampanaNotificaciones";
import BotonTema from "./BotonTema";
import LogoMemoPsy from "@/components/comunes/LogoMemoPsy"
import FotoPerfil from "./FotoPerfil";
import { LineasEmergencia, useAvisoCrisis } from "@/components/crisis/aviso-crisis";

export default function BarraSistema() {
  const { data: session } = useSession();
  // RF 4.3 - Aviso de crisis desde el menú: sale al tocar, sin abrir otra pantalla
  const avisoCrisis = useAvisoCrisis();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic afuera o al cambiar de página
  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (menu.current && !menu.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClic);
    return () => document.removeEventListener("mousedown", alHacerClic);
  }, []);
  useEffect(() => setAbierto(false), [ruta]);

  const usuario = session?.user;
  const nombreCompleto = usuario?.persona
    ? `${usuario.persona.nombre} ${usuario.persona.apellido}`
    : usuario?.email ?? "";
  const nombresPerfiles: string[] = (usuario?.perfiles ?? []).map((p: { nombre?: string }) => p?.nombre ?? "");
  const datosFoto = {
    nombre: usuario?.persona?.nombre,
    apellido: usuario?.persona?.apellido,
    email: usuario?.email ?? undefined,
    perfiles: nombresPerfiles,
  };
  const permisos: string[] = (usuario?.permisos ?? []).map((p: { nombre: string }) => p.nombre);
  // Cada módulo aparece si la persona tiene al menos uno de sus permisos (lista central en src/config/modulos.ts)
  const modulos = modulosParaUsuario(MODULOS_DISPONIBLES.filter((m) => m.permisosRequeridos.some((p) => permisos.includes(p))), usuario);

  return (
    <nav className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/welcome" className="flex items-center gap-3">
          {/* En el celular, logo más chico para que entren la campanita, el tema y el menú */}
          <span className="sm:hidden"><LogoMemoPsy tamano="xs" /></span>
          <span className="hidden sm:block"><LogoMemoPsy tamano="sm" /></span>
        </Link>

        {/* Accesos rápidos a los módulos (en pantallas grandes) */}
        <div className="hidden items-center gap-1 md:flex">
          {modulos.map((m) => {
            const activo = ruta?.startsWith(m.ruta);
            return (
              <Link
                key={m.ruta}
                href={m.ruta}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activo ? "bg-primary/15 text-dorado" : "text-crema/75 hover:bg-foreground/5 hover:text-crema"
                }`}
              >
                {m.nombre}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-sm text-crema/70 lg:block">{nombreCompleto}</span>
          <BotonTema />
          <CampanaNotificaciones />
          <div ref={menu} className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAbierto(!abierto)}
              aria-expanded={abierto}
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
              className="flex h-10 items-center gap-2 rounded-full border border-foreground/15 pl-1 pr-3 text-crema transition-colors hover:border-primary/60"
            >
              <FotoPerfil {...datosFoto} tamano={32} />
              {abierto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
  
            {abierto && (
              <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-foreground/10 bg-card text-crema shadow-2xl shadow-black/40">
                <div className="flex items-center gap-3 border-b border-foreground/10 p-4">
                  <FotoPerfil {...datosFoto} tamano={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{nombreCompleto}</p>
                    <p className="truncate text-sm text-crema/65">{usuario?.email}</p>
                  </div>
                </div>
                <div className="p-2">
                  <Link href="/welcome" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5">
                    <HomeIcon className="h-5 w-5 text-crema/70" />
                    Inicio
                  </Link>
                  <Link href="/cuenta" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5">
                    <UserRound className="h-5 w-5 text-crema/70" />
                    Mi cuenta
                  </Link>
                  {modulos.map((m) => (
                    <Link key={m.ruta} href={m.ruta} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5">
                      <m.icon className="h-5 w-5 text-dorado" />
                      {m.nombre}
                    </Link>
                  ))}
                  {/* RF 4.3 - El paciente le avisa a su psicólogo/a de una crisis desde cualquier pantalla:
                      un toque y el aviso sale; debajo aparecen los teléfonos de emergencia */}
                  {usuario?.pacienteId &&
                    (avisoCrisis.estado === "enviado" ? (
                      <div className="rounded-xl px-3 py-2.5" role="status">
                        <p className="flex items-center gap-2 font-semibold text-exito">
                          <Check className="h-5 w-5" aria-hidden="true" />
                          Tu psicólogo/a ya recibió el aviso.
                        </p>
                        <LineasEmergencia className="mt-2" textoClassName="font-normal text-suave" />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={avisoCrisis.avisar}
                          disabled={avisoCrisis.estado === "enviando"}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-peligro transition-colors hover:bg-red-500/10 disabled:cursor-wait"
                        >
                          {avisoCrisis.estado === "enviando" ? (
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                          ) : (
                            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                          )}
                          {avisoCrisis.estado === "enviando" ? "Avisando..." : "Avisar a mi psicólogo/a"}
                        </button>
                        {avisoCrisis.estado === "error" && (
                          <p className="px-3 pb-2 text-sm text-peligro" role="alert">{avisoCrisis.error}</p>
                        )}
                      </>
                    ))}
                </div>
                <div className="border-t border-foreground/10 p-2">
                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-peligro transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
