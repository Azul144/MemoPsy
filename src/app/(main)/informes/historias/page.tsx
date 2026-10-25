// src/app/(main)/informes/historias/page.tsx
// Historias clínicas: los pacientes del psicólogo y el estado de su historia.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

interface ResultadoBusqueda {
  id: string;
  persona: { nombre: string; apellido: string; dni?: string };
}

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

function EstadoHistoria({ p }: { p: PacienteDeHistoria }) {
  if (!p.historiaId) return <Badge className="bg-gray-600/40 text-gray-300 hover:bg-gray-600/40">Sin abrir</Badge>;
  if (p.cerrada) return <Badge className="bg-sky-500/20 text-sky-200 hover:bg-sky-500/20">Cerrada</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">En curso</Badge>;
}

export default function HistoriasClinicasPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<PacienteDeHistoria[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  // Buscar un paciente que todavía no atiende (por ejemplo, la primera entrevista sin turno cargado)
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/historias-clinicas")
      .then(async (r) => {
        const datos = await r.json().catch(() => null);
        if (!r.ok) throw new Error(datos?.message || datos?.error || "No se pudo cargar la lista.");
        setPacientes(datos);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    temporizador.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await fetch(`/api/pacientes/buscar?q=${encodeURIComponent(busqueda.trim())}`);
        setResultados(r.ok ? await r.json() : []);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }, [busqueda]);

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
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {pacientes === null && !error && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#F1C77A]" />
            Cargando pacientes...
          </div>
        )}

        {pacientes && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-2xl border border-[#2A4A4A] bg-[#1D3434] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#F1C77A]">Tus pacientes</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Filtrar por nombre o DNI"
                    className="border-gray-600 bg-[#152A2A] pl-9 text-white"
                  />
                </div>
              </div>

              {filtrados.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  {pacientes.length === 0
                    ? "Todavía no tenés pacientes con turnos o notas. Buscá uno a la derecha para abrir su historia."
                    : "Ningún paciente coincide con el filtro."}
                </p>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {filtrados.map((p) => (
                    <li key={p.pacienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">
                          {p.apellido}, {p.nombre}
                        </p>
                        <p className="text-xs text-gray-400">
                          DNI {p.dni}
                          {p.obraSocial ? ` · ${p.obraSocial}` : ""}
                          {p.fechaActualizacion ? ` · actualizada el ${fechaCorta(p.fechaActualizacion)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <EstadoHistoria p={p} />
                        {p.historiaId && (
                          <Button asChild size="sm" variant="outline" className="border-gray-500 text-gray-200 hover:bg-gray-700 hover:text-white">
                            <a href={`/api/historias-clinicas/${p.pacienteId}/pdf`} title="Descargar en PDF">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm" className="bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">
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

            <aside className="h-fit rounded-2xl border border-[#2A4A4A] bg-[#1D3434] p-5">
              <h2 className="mb-1 text-lg font-semibold text-[#F1C77A]">Otro paciente</h2>
              <p className="mb-3 text-sm text-gray-400">Para abrir la historia de alguien que todavía no tiene turnos ni notas con vos.</p>
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, apellido o DNI"
                className="border-gray-600 bg-[#152A2A] text-white"
              />
              <div className="mt-2 space-y-1">
                {buscando && <p className="text-sm text-gray-400">Buscando...</p>}
                {!buscando && busqueda.trim().length >= 2 && resultados.length === 0 && (
                  <p className="text-sm text-gray-400">No se encontraron pacientes.</p>
                )}
                {resultados.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => router.push(`/informes/historias/${r.id}`)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[#152A2A]"
                  >
                    {r.persona.apellido}, {r.persona.nombre}
                    {r.persona.dni ? <span className="text-gray-400"> · DNI {r.persona.dni}</span> : null}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
