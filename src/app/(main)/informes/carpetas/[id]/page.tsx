// src/app/(main)/informes/carpetas/[id]/page.tsx
// Carpeta de un paciente ([id] = id del paciente), para su psicólogo tratante:
//  - Turnos: los programados y los anteriores, separados por franja (mañana / tarde-noche).
//  - Seguimientos: los informes de seguimiento, filtrables de una fecha a otra.
//  - Notas clínicas: la nota de cada sesión.
//  - Historia clínica: el total, todo junto en orden de fecha hasta el último turno, seguimiento y nota.
"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, BookOpen, CalendarDays, Check, ClipboardCheck, Download, FolderOpen, Loader2, Moon, NotebookPen, Plus, Sun, X,
} from "lucide-react";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { armarRecorrido, diaLargo } from "@/lib/carpetas/sesiones";

interface Turno { id: string; inicio: string; fin: string | null; estado: string; modalidad: string; franja: "manana" | "tarde" | null }
interface Nota { id: string; titulo: string; fecha: string; etiquetas: string | null; tieneSeguimiento: boolean }
interface Seguimiento {
  informeId: string; tituloNota: string; fecha: string; resumen: string; pautas: string | null; avances: string | null;
  actividades: { descripcion: string; respuesta: string | null; comentario: string | null }[];
}
interface Carpeta {
  paciente: { id: string; nombre: string; apellido: string; dni: string; obraSocial: string | null; fechaNacimiento: string | null };
  historia: { estado: "sin_abrir" | "en_curso" | "cerrada"; fechaAdmision: string | null; fechaCierre: string | null; motivoConsulta: string | null };
  turnos: Turno[];
  notas: Nota[];
  seguimientos: Seguimiento[];
}

const ZONA = "America/Argentina/Buenos_Aires";
const fecha = (iso: string) => new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA }).format(new Date(iso));
const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA }).format(new Date(iso));
const hora = (iso: string) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(iso));
// "yyyy-mm-dd" en hora de Argentina, para comparar con los campos de fecha
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));

const ESTADO_HISTORIA = {
  sin_abrir: { texto: "Sin abrir", clase: "bg-superficie/40 text-suave hover:bg-superficie/40" },
  en_curso: { texto: "En curso", clase: "bg-emerald-500/20 text-exito hover:bg-emerald-500/20" },
  cerrada: { texto: "Cerrada", clase: "bg-sky-500/20 text-info hover:bg-sky-500/20" },
} as const;

const colorEstado = (estado: string) =>
  ({
    Confirmada: "bg-emerald-500/20 text-exito border-emerald-500/40",
    Pendiente: "bg-amber-500/20 text-aviso border-amber-500/40",
    Cancelada: "bg-red-500/20 text-peligro border-red-500/40",
    Finalizada: "bg-sky-500/20 text-info border-sky-500/40",
    Reprogramada: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  })[estado] ?? "";

function edad(nacimiento: string | null) {
  if (!nacimiento) return null;
  const n = new Date(nacimiento + "T12:00:00");
  const hoy = new Date();
  let a = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) a--;
  return a;
}

function Dato({ icono: Icono, valor, texto }: { icono: React.ElementType; valor: number | string; texto: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-4">
      <Icono className="h-5 w-5 text-dorado" />
      <p className="mt-2 text-2xl font-bold text-crema">{valor}</p>
      <p className="text-sm text-suave">{texto}</p>
    </div>
  );
}

function FilaTurno({ t }: { t: Turno }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        {t.franja === "manana" ? <Sun className="h-4 w-4 text-dorado" /> : <Moon className="h-4 w-4 text-dorado" />}
        <div>
          <p className="font-medium text-foreground first-letter:uppercase">{fechaLarga(t.inicio)}</p>
          <p className="text-sm text-suave">
            {hora(t.inicio)}
            {t.fin ? ` a ${hora(t.fin)}` : ""} · {t.franja === "manana" ? "Mañana" : "Tarde-noche"} · {t.modalidad}
          </p>
        </div>
      </div>
      <Badge variant="outline" className={colorEstado(t.estado)}>{t.estado}</Badge>
    </li>
  );
}

function TarjetaSeguimiento({ s }: { s: Seguimiento }) {
  return (
    <article className="rounded-2xl border border-foreground/10 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-dorado">Seguimiento del {fecha(s.fecha)}</p>
        <Link href={`/informes/detalle/${s.informeId}`} className="text-sm text-dorado hover:underline">
          Ver la nota de esa sesión
        </Link>
      </div>
      <p className="mt-3 whitespace-pre-line text-texto-2">{s.resumen}</p>
      {s.avances && <p className="mt-3 text-sm text-exito"><strong>Avances:</strong> {s.avances}</p>}
      {s.pautas && <p className="mt-2 text-sm text-suave"><strong>Pautas:</strong> {s.pautas}</p>}
      {s.actividades.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.actividades.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {a.respuesta === "HECHA" ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-exito" />
              ) : a.respuesta === "NO_PUDE" ? (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-peligro" />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tenue" />
              )}
              <span className="text-texto-2">
                {a.descripcion}
                {a.comentario && <span className="text-tenue"> — “{a.comentario}”</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function CarpetaPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [error, setError] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    fetch(`/api/carpetas/${id}`)
      .then(async (r) => {
        const datos = await r.json().catch(() => null);
        if (!r.ok) throw new Error(datos?.message || "No se pudo cargar la carpeta.");
        setCarpeta(datos);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const ahora = Date.now();
  const programados = useMemo(
    () => (carpeta?.turnos ?? []).filter((t) => new Date(t.inicio).getTime() >= ahora && t.estado !== "Cancelada" && t.estado !== "Finalizada"),
    [carpeta, ahora],
  );
  const anteriores = useMemo(
    () => (carpeta?.turnos ?? []).filter((t) => !programados.includes(t)).reverse(),
    [carpeta, programados],
  );
  const seguimientosFiltrados = useMemo(
    () =>
      (carpeta?.seguimientos ?? [])
        .filter((s) => (!desde || diaLocal(s.fecha) >= desde) && (!hasta || diaLocal(s.fecha) <= hasta))
        .slice()
        .reverse(),
    [carpeta, desde, hasta],
  );

  // Historia clínica: sesión por sesión (turno, nota y seguimiento del mismo día), del primer día al último
  const recorrido = useMemo(
    () => (carpeta ? armarRecorrido(carpeta.turnos, carpeta.notas, carpeta.seguimientos, ahora) : []),
    [carpeta, ahora],
  );

  const ultimo = (tipo: "turno" | "nota" | "seguimiento") => {
    for (const s of [...recorrido].reverse()) {
      const lista = tipo === "turno" ? s.turnos.map((t) => t.inicio) : (tipo === "nota" ? s.notas : s.seguimientos).map((x) => x.fecha);
      if (lista.length) return lista[lista.length - 1];
    }
    return null;
  };

  if (error) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Carpeta del paciente" volverA="/informes/carpetas" textoVolver="Volver a las carpetas" />
        <div className="flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-peligro">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </main>
    );
  }
  if (!carpeta) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-suave">
        <Loader2 className="h-6 w-6 animate-spin text-dorado" />
        Abriendo la carpeta...
      </div>
    );
  }

  const { paciente, historia } = carpeta;
  const años = edad(paciente.fechaNacimiento);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina
          titulo={`${paciente.nombre} ${paciente.apellido}`}
          descripcion={[`DNI ${paciente.dni}`, años != null ? `${años} años` : null, paciente.obraSocial ?? "Sin obra social"].filter(Boolean).join(" · ")}
          volverA="/informes/carpetas"
          textoVolver="Volver a las carpetas"
        />

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Dato icono={CalendarDays} valor={programados.length} texto={programados.length === 1 ? "turno programado" : "turnos programados"} />
          <Dato icono={FolderOpen} valor={carpeta.turnos.length} texto="turnos en total" />
          <Dato icono={ClipboardCheck} valor={carpeta.seguimientos.length} texto="seguimientos" />
          <Dato icono={NotebookPen} valor={carpeta.notas.length} texto="notas clínicas" />
        </div>

        <Tabs defaultValue="turnos" className="w-full">
          <TabsList className="mb-4 flex w-full max-w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="turnos" className="shrink-0 px-3 sm:px-5">Turnos</TabsTrigger>
            <TabsTrigger value="seguimientos" className="shrink-0 px-3 sm:px-5">Seguimientos</TabsTrigger>
            <TabsTrigger value="notas" className="shrink-0 px-3 sm:px-5">Notas clínicas</TabsTrigger>
            <TabsTrigger value="historia" className="shrink-0 px-3 sm:px-5">Historia clínica</TabsTrigger>
          </TabsList>

          <TabsContent value="turnos" className="space-y-6">
            <section className="rounded-2xl border border-borde bg-card p-5">
              <h2 className="mb-3 text-lg font-semibold text-dorado">Programados ({programados.length})</h2>
              {programados.length === 0 ? (
                <p className="text-sm text-tenue">No tiene turnos próximos.</p>
              ) : (
                <ul className="space-y-2">{programados.map((t) => <FilaTurno key={t.id} t={t} />)}</ul>
              )}
            </section>
            <section className="rounded-2xl border border-borde bg-card p-5">
              <h2 className="mb-3 text-lg font-semibold text-dorado">Anteriores ({anteriores.length})</h2>
              {anteriores.length === 0 ? (
                <p className="text-sm text-tenue">Todavía no tuvo turnos.</p>
              ) : (
                <ul className="space-y-2">{anteriores.map((t) => <FilaTurno key={t.id} t={t} />)}</ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="seguimientos">
            <section className="rounded-2xl border border-borde bg-card p-5">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="desde" className="text-suave">Desde</Label>
                  <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border-borde-fuerte bg-background text-foreground" />
                </div>
                <div>
                  <Label htmlFor="hasta" className="text-suave">Hasta</Label>
                  <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="border-borde-fuerte bg-background text-foreground" />
                </div>
                {(desde || hasta) && (
                  <Button variant="ghost" onClick={() => { setDesde(""); setHasta(""); }} className="text-suave">
                    Ver todos
                  </Button>
                )}
                <p className="ml-auto text-sm text-tenue">
                  {seguimientosFiltrados.length} de {carpeta.seguimientos.length} seguimientos
                </p>
              </div>
              {seguimientosFiltrados.length === 0 ? (
                <p className="py-6 text-center text-sm text-tenue">
                  {carpeta.seguimientos.length === 0
                    ? "Todavía no le compartiste ningún informe de seguimiento. Se arma desde la nota clínica de la sesión."
                    : "No hay seguimientos entre esas fechas."}
                </p>
              ) : (
                <div className="space-y-3">{seguimientosFiltrados.map((s) => <TarjetaSeguimiento key={s.informeId} s={s} />)}</div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="notas">
            <section className="rounded-2xl border border-borde bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-dorado">Notas de cada sesión</h2>
                <Button asChild size="sm" className="bg-primary text-primary-foreground">
                  <Link href="/informes/registrar"><Plus className="mr-1 h-4 w-4" />Nueva nota</Link>
                </Button>
              </div>
              {carpeta.notas.length === 0 ? (
                <p className="py-6 text-center text-sm text-tenue">Todavía no hay notas clínicas de este paciente.</p>
              ) : (
                <ul className="divide-y divide-foreground/10">
                  {carpeta.notas.slice().reverse().map((n) => (
                    <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{n.titulo}</p>
                        <p className="text-sm text-tenue">
                          {fecha(n.fecha)}
                          {n.etiquetas ? ` · ${n.etiquetas}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {n.tieneSeguimiento && <Badge className="bg-primary/15 text-dorado hover:bg-primary/15">Con seguimiento</Badge>}
                        <Button asChild size="sm" variant="outline" className="border-borde-fuerte text-texto-2">
                          <Link href={`/informes/detalle/${n.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="historia" className="space-y-4">
            <section className="rounded-2xl border border-borde bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-dorado" />
                  <h2 className="text-lg font-semibold text-dorado">Historia clínica</h2>
                  <Badge className={ESTADO_HISTORIA[historia.estado].clase}>{ESTADO_HISTORIA[historia.estado].texto}</Badge>
                </div>
                <div className="flex gap-2">
                  {historia.estado !== "sin_abrir" && (
                    <Button asChild size="sm" variant="outline" className="border-borde-fuerte text-texto-2">
                      <a href={`/api/historias-clinicas/${paciente.id}/pdf`}><Download className="mr-1 h-4 w-4" />PDF</a>
                    </Button>
                  )}
                  <Button asChild size="sm" className="bg-primary text-primary-foreground">
                    <Link href={`/informes/historias/${paciente.id}`}>{historia.estado === "sin_abrir" ? "Abrir historia" : "Ver o editar"}</Link>
                  </Button>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-tenue">Admisión</dt><dd className="text-foreground">{historia.fechaAdmision ? fecha(historia.fechaAdmision) : "—"}</dd></div>
                <div><dt className="text-tenue">Último turno</dt><dd className="text-foreground">{ultimo("turno") ? fecha(ultimo("turno")!) : "—"}</dd></div>
                <div><dt className="text-tenue">Último seguimiento</dt><dd className="text-foreground">{ultimo("seguimiento") ? fecha(ultimo("seguimiento")!) : "—"}</dd></div>
                <div><dt className="text-tenue">Última nota</dt><dd className="text-foreground">{ultimo("nota") ? fecha(ultimo("nota")!) : "—"}</dd></div>
              </dl>
              {historia.motivoConsulta && (
                <p className="mt-4 text-sm text-texto-2"><span className="text-tenue">Motivo de consulta: </span>{historia.motivoConsulta}</p>
              )}
            </section>

            <section className="rounded-2xl border border-borde bg-card p-5">
              <h3 className="font-semibold text-foreground">Todo el recorrido, del primer día al último</h3>
              <p className="mb-5 text-sm text-tenue">Cada sesión junta el turno, la nota clínica y el informe de seguimiento de ese día.</p>
              {recorrido.length === 0 ? (
                <p className="text-sm text-tenue">Todavía no hay turnos, notas ni seguimientos.</p>
              ) : (
                <ol className="space-y-3">
                  {recorrido.map((s) => (
                    <li key={s.dia} className="rounded-xl border border-foreground/10 bg-background p-4">
                      <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-dorado">
                        Sesión {s.numero}
                        <span className="text-sm font-normal text-suave first-letter:uppercase">{diaLargo(s.dia)}</span>
                      </p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {s.turnos.map((t) => (
                          <li key={t.id} className="flex items-start gap-2">
                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
                            <span className="text-texto-2">
                              Turno de {hora(t.inicio)}{t.fin ? ` a ${hora(t.fin)}` : ""} · {t.franja === "manana" ? "mañana" : "tarde-noche"} · {t.modalidad} · {t.estado}
                            </span>
                          </li>
                        ))}
                        {s.notas.map((n) => (
                          <li key={n.id} className="flex items-start gap-2">
                            <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
                            <span>
                              <span className="text-tenue">Nota clínica: </span>
                              <Link href={`/informes/detalle/${n.id}`} className="text-foreground hover:text-dorado hover:underline">{n.titulo}</Link>
                            </span>
                          </li>
                        ))}
                        {s.seguimientos.map((seg) => (
                          <li key={seg.informeId} className="flex items-start gap-2">
                            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
                            <span className="text-texto-2">
                              <span className="text-tenue">Seguimiento: </span>
                              {seg.resumen.length > 140 ? `${seg.resumen.slice(0, 140).trimEnd()}…` : seg.resumen}
                            </span>
                          </li>
                        ))}
                        {s.notas.length === 0 && s.turnos.length > 0 && (
                          <li className="pl-6 text-xs text-tenue">Sin nota clínica de esta sesión.</li>
                        )}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
              {programados.length > 0 && (
                <p className="mt-4 flex items-center gap-2 text-sm text-suave">
                  <CalendarDays className="h-4 w-4 text-dorado" />
                  Lo que sigue: {programados.length} {programados.length === 1 ? "turno programado" : "turnos programados"}, el próximo el {fecha(programados[0].inicio)} a las {hora(programados[0].inicio)}.
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
