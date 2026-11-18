// src/components/sistema/FotoPerfil.tsx
// RF 1.3 - Foto de perfil del usuario que inició sesión, con las iniciales si no tiene.
// Todas las fotos de la pantalla (barra, menú, Mi cuenta) comparten un mismo estado:
// cuando se cambia o se quita la foto, se actualizan juntas sin recargar la página.
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const EVENTO = "memopsy-foto-perfil";
// undefined = todavía no se consultó; null = sin foto; texto = fecha de la última foto
let versionActual: string | null | undefined;
let consulta: Promise<void> | null = null;

function consultarVersion() {
  if (!consulta) {
    consulta = fetch("/api/usuarios/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((datos) => avisarCambioFoto(datos?.fotoActualizada ?? null))
      .catch(() => avisarCambioFoto(null));
  }
  return consulta;
}

export function avisarCambioFoto(version: string | null) {
  versionActual = version;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: version }));
}

export function useVersionFoto() {
  const [version, setVersion] = useState<string | null | undefined>(versionActual);
  useEffect(() => {
    const alCambiar = (e: Event) => setVersion((e as CustomEvent<string | null>).detail);
    window.addEventListener(EVENTO, alCambiar);
    if (versionActual === undefined) consultarVersion();
    else setVersion(versionActual);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);
  return version;
}

// Color de las iniciales según el rol (el primero que coincida)
const COLORES: [string, string][] = [
  ["Psicólogo", "bg-primary text-primary-foreground"],
  ["Paciente", "bg-info/20 text-info"],
  ["Recepcionista", "bg-exito/20 text-exito"],
  ["Administrador", "bg-naranja/20 text-naranja"],
  ["Auditor", "bg-violeta/20 text-violeta"],
];

export function colorDeRol(perfiles: string[]) {
  return COLORES.find(([rol]) => perfiles.includes(rol))?.[1] ?? "bg-primary text-primary-foreground";
}

interface Props {
  nombre?: string;
  apellido?: string;
  email?: string;
  perfiles?: string[];
  tamano: number; // en píxeles
  className?: string;
}

export default function FotoPerfil({ nombre, apellido, email, perfiles = [], tamano, className }: Props) {
  const version = useVersionFoto();
  const [fallo, setFallo] = useState<string | null>(null);

  const iniciales = nombre || apellido
    ? `${nombre?.[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase()
    : (email?.[0] ?? "·").toUpperCase();
  const conFoto = !!version && fallo !== version;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        !conFoto && colorDeRol(perfiles),
        className,
      )}
      style={{ width: tamano, height: tamano, fontSize: Math.max(11, Math.round(tamano * 0.38)) }}
    >
      {conFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- la foto sale de la API con sesión, no de un archivo estático
        <img
          src={`/api/usuarios/me/foto?v=${encodeURIComponent(version)}`}
          alt={`Foto de ${[nombre, apellido].filter(Boolean).join(" ") || "perfil"}`}
          width={tamano}
          height={tamano}
          className="h-full w-full object-cover"
          onError={() => setFallo(version)}
        />
      ) : (
        <span aria-hidden="true">{iniciales}</span>
      )}
    </span>
  );
}
