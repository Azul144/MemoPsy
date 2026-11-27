// src/app/(main)/informes/carpetas/page.tsx
// Una carpeta por paciente: cuántos turnos tiene programados y qué hay adentro
// (seguimientos, notas clínicas e historia clínica).
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarDays, ClipboardCheck, Folder, FolderOpen, Loader2, NotebookPen, Search } from "lucide-react";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ResumenCarpeta {
  pacienteId: string;
  nombre: string;
  apellido: string;
  obraSocial: string | null;
  turnosProgramados: number;
  turnosTotales: number;
  proximoTurno: string | null;
  ultimoTurno: string | null;
  notas: number;
  seguimientos: number;
  historia: "sin_abrir" | "en_curso" | "cerrada";
}

const fechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

const ESTADO_HISTORIA = {
  sin_abrir: { texto: "Historia sin abrir", clase: "bg-superficie/40 text-suave hover:bg-superficie/40" },
  en_curso: { texto: "Historia en curso", clase: "bg-emerald-500/20 text-exito hover:bg-emerald-500/20" },
  cerrada: { texto: "Historia cerrada", clase: "bg-sky-500/20 text-info hover:bg-sky-500/20" },
} as const;

export default function CarpetasPage() {
  const [carpetas, setCarpetas] = useState<ResumenCarpeta[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/api/carpetas")
      .then(async (r) => {
        const datos = await r.json().catch(() => null);
        if (!r.ok) throw new Error(datos?.message || "No se pudieron cargar las carpetas.");
        setCarpetas(datos);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtradas = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    const lista = carpetas ?? [];
    return t ? lista.filter((c) => `${c.nombre} ${c.apellido}`.toLowerCase().includes(t)) : lista;
  }, [carpetas, filtro]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina
          titulo="Carpetas de pacientes"
          descripcion="Cada paciente tiene su carpeta: sus turnos, los seguimientos, las notas de cada sesión y la historia clínica completa."
          volverA="/informes"
          textoVolver="Volver a Informes"
        />

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-peligro">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {carpetas === null && !error && (
          <div className="flex items-center justify-center gap-3 py-16 text-suave">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
            Cargando carpetas...
          </div>
        )}

        {carpetas && (
          <>
            <div className="mb-5 relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" />
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar paciente"
                className="border-borde-fuerte bg-background pl-9 text-foreground"
              />
            </div>

            {filtradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-tenue">
                {carpetas.length === 0 ? "Todavía no tenés pacientes con turnos o notas." : "Ningún paciente coincide con la búsqueda."}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtradas.map((c) => (
                  <Link
                    key={c.pacienteId}
                    href={`/informes/carpetas/${c.pacienteId}`}
                    className="group flex flex-col rounded-3xl border border-foreground/10 bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-black/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 group-hover:bg-primary">
                        <Folder className="h-5 w-5 text-dorado group-hover:hidden" />
                        <FolderOpen className="hidden h-5 w-5 text-primary-foreground group-hover:block" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-crema">
                          {c.apellido}, {c.nombre}
                        </p>
                        <p className="text-sm text-tenue">{c.obraSocial ?? "Sin obra social"}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3">
                      <p className="text-3xl font-bold text-dorado">{c.turnosProgramados}</p>
                      <p className="text-sm text-crema/80">
                        {c.turnosProgramados === 1 ? "turno programado" : "turnos programados"}
                      </p>
                      <p className="mt-1 text-xs text-tenue">
                        {c.proximoTurno ? `Próximo: ${fechaHora(c.proximoTurno)}` : "Sin turnos próximos"}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-suave">
                      <span className="flex flex-col items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-dorado" />
                        {c.turnosTotales} turnos
                      </span>
                      <span className="flex flex-col items-center gap-1">
                        <NotebookPen className="h-4 w-4 text-dorado" />
                        {c.notas} notas
                      </span>
                      <span className="flex flex-col items-center gap-1">
                        <ClipboardCheck className="h-4 w-4 text-dorado" />
                        {c.seguimientos} seguim.
                      </span>
                    </div>

                    <Badge className={`mt-4 w-fit ${ESTADO_HISTORIA[c.historia].clase}`}>{ESTADO_HISTORIA[c.historia].texto}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
