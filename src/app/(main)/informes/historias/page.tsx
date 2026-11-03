// src/app/(main)/informes/historias/page.tsx
// Historias clínicas: los pacientes del psicólogo y el estado de su historia.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Download, FileSignature, Loader2, Search } from "lucide-react";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PacienteDeHistoria {
  pacienteId: string;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  historiaId: string | null;
  fechaActualizacion: string | null;
  cerrada: boolean;
}

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

function EstadoHistoria({ p }: { p: PacienteDeHistoria }) {
  if (!p.historiaId) return <Badge className="bg-superficie/40 text-suave hover:bg-superficie/40">Sin abrir</Badge>;
  if (p.cerrada) return <Badge className="bg-sky-500/20 text-info hover:bg-sky-500/20">Cerrada</Badge>;
  return <Badge className="bg-emerald-500/20 text-exito hover:bg-emerald-500/20">En curso</Badge>;
}

export default function HistoriasClinicasPage() {
  const [pacientes, setPacientes] = useState<PacienteDeHistoria[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/api/historias-clinicas")
      .then(async (r) => {
        const datos = await r.json().catch(() => null);
        if (!r.ok) throw new Error(datos?.message || datos?.error || "No se pudo cargar la lista.");
        setPacientes(datos);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtrados = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!pacientes || !t) return pacientes ?? [];
    return pacientes.filter((p) => `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(t));
  }, [pacientes, filtro]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina
          titulo="Historias clínicas"
          descripcion="La historia clínica de cada paciente: admisión, evolución con tus notas en orden de fecha y cierre. Se descarga en PDF foliado."
          volverA="/informes"
          textoVolver="Volver a Informes"
        />

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-peligro">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {pacientes === null && !error && (
          <div className="flex items-center justify-center gap-3 py-16 text-suave">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
            Cargando pacientes...
          </div>
        )}

        {pacientes && (
            <section className="rounded-2xl border border-borde bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-dorado">Tus pacientes</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" />
                  <Input
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Filtrar por nombre o DNI"
                    className="border-borde-fuerte bg-background pl-9 text-foreground"
                  />
                </div>
              </div>

              {filtrados.length === 0 ? (
                <p className="py-8 text-center text-sm text-tenue">
                  {pacientes.length === 0
                    ? "Todavía no tenés pacientes con turnos o notas. Su historia se puede abrir cuando tengan al menos uno."
                    : "Ningún paciente coincide con el filtro."}
                </p>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {filtrados.map((p) => (
                    <li key={p.pacienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {p.apellido}, {p.nombre}
                        </p>
                        <p className="text-sm text-tenue">
                          DNI {p.dni}
                          {p.obraSocial ? ` · ${p.obraSocial}` : ""}
                          {p.fechaActualizacion ? ` · actualizada el ${fechaCorta(p.fechaActualizacion)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <EstadoHistoria p={p} />
                        {p.historiaId && (
                          <Button asChild size="sm" variant="outline" className="border-borde-fuerte text-texto-2 hover:bg-superficie hover:text-foreground">
                            <a href={`/api/historias-clinicas/${p.pacienteId}/pdf`} title="Descargar en PDF">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-opacity-80">
                          <Link href={`/informes/historias/${p.pacienteId}`}>
                            {p.historiaId ? <BookOpen className="mr-2 h-4 w-4" /> : <FileSignature className="mr-2 h-4 w-4" />}
                            {p.historiaId ? "Abrir" : "Completar"}
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
        )}
      </main>
    </div>
  );
}
