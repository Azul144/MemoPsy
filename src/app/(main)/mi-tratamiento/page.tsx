// src/app/(main)/mi-tratamiento/page.tsx
// "Mi tratamiento": todo lo del paciente en una sola lista, sin lo privado del psicólogo.
// Del lado del paciente se habla de "sesiones" (el psicólogo da "turnos").
//  - Próximas sesiones (con videollamada y reprogramación, igual que en la agenda).
//  - Sesiones que tuvo, del primer día al último, con su seguimiento si lo hay.
//  - Sus informes de seguimiento, filtrables por fecha.
// Nunca muestra notas clínicas ni la historia clínica. Usa las mismas APIs que la agenda y los
// seguimientos, que ya devuelven solo lo del paciente que entra.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertCircle, CalendarClock, CalendarDays, Check, ClipboardCheck, HeartHandshake, Loader2, Moon, Sun, Video } from "lucide-react";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import DialogoReprogramar from "@/components/sesiones/DialogoReprogramar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { armarRecorrido, diaDelConsultorio, diaLargo, horaDelConsultorio } from "@/lib/carpetas/sesiones";

interface Turno {
  id: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  psicologo?: { id: string; persona: { nombre: string; apellido: string } } | null;
  modalidad?: { nombre: string } | null;
  estado?: { nombre: string } | null;
  enlaceVideollamada?: string | null;
}
interface Seguimiento {
  id: string;
  fechaSesion: string;
  psicologo: string | null;
  resumen: string;
  actividades: { respuesta: string | null }[];
}

const UN_DIA = 24 * 60 * 60 * 1000;
const fecha = (iso: string) => diaLargo(diaDelConsultorio(iso));
const esManana = (iso: string) => Number(horaDelConsultorio(iso).slice(0, 2)) < 14;
const nombrePsicologo = (t: Pick<Turno, "psicologo">) => (t.psicologo ? `${t.psicologo.persona.nombre} ${t.psicologo.persona.apellido}` : null);

const colorEstado = (estado?: string) =>
  ({
    Confirmada: "bg-emerald-500/20 text-exito border-emerald-500/40",
    Pendiente: "bg-amber-500/20 text-aviso border-amber-500/40",
    Reprogramada: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  })[estado ?? ""] ?? "";

function Dato({ valor, texto }: { valor: string | number; texto: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-4">
      <p className="text-2xl font-bold text-crema first-letter:uppercase">{valor}</p>
      <p className="text-sm text-suave">{texto}</p>
    </div>
  );
}

export default function MiTratamientoPage() {
  const { data: session, status } = useSession();
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [error, setError] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [reprogramar, setReprogramar] = useState<Turno | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [rt, rs] = await Promise.all([fetch("/api/sesiones"), fetch("/api/seguimientos")]);
      if (!rt.ok) throw new Error("No se pudieron cargar tus sesiones.");
      setTurnos(await rt.json());
      setSeguimientos(rs.ok ? ((await rs.json()).seguimientos ?? []) : []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.pacienteId) cargar();
  }, [status, session, cargar]);

  const ahora = Date.now();
  const proximos = useMemo(
    () =>
      (turnos ?? [])
        .filter((t) => new Date(t.fechaHoraInicio).getTime() >= ahora && t.estado?.nombre !== "Cancelada" && t.estado?.nombre !== "Finalizada")
        .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio)),
    [turnos, ahora],
  );
  const sesiones = useMemo(
    () =>
      armarRecorrido(
        (turnos ?? []).map((t) => ({ ...t, inicio: t.fechaHoraInicio, fin: t.fechaHoraFin, estado: t.estado?.nombre ?? "", modalidad: t.modalidad?.nombre ?? "" })),
        [] as { fecha: string }[],
        seguimientos.map((s) => ({ ...s, fecha: s.fechaSesion })),
        ahora,
      ),
    [turnos, seguimientos, ahora],
  );
  const seguimientosFiltrados = useMemo(
    () =>
      seguimientos.filter((s) => {
        const dia = diaDelConsultorio(s.fechaSesion);
        return (!desde || dia >= desde) && (!hasta || dia <= hasta);
      }),
    [seguimientos, desde, hasta],
  );

  if (status === "loading" || (session?.user?.pacienteId && turnos === null && !error)) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-suave">
        <Loader2 className="h-6 w-6 animate-spin text-dorado" />
        Cargando tu tratamiento...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <EncabezadoPagina
          titulo="Mi tratamiento"
          descripcion="Tus próximas sesiones, las que ya tuviste y lo que trabajaste en cada una."
          volverA="/welcome"
          textoVolver="Volver al inicio"
        />

        {!session?.user?.pacienteId ? (
          <p className="rounded-2xl border border-borde bg-card p-6 text-center text-suave">Esta sección es para pacientes.</p>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-peligro">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Dato valor={proximos.length} texto={proximos.length === 1 ? "sesión programada" : "sesiones programadas"} />
              <Dato
                valor={proximos[0] ? `${fecha(proximos[0].fechaHoraInicio).split(" ")[0]} ${horaDelConsultorio(proximos[0].fechaHoraInicio)}` : "—"}
                texto={proximos[0] ? `Próxima sesión · ${fecha(proximos[0].fechaHoraInicio).split(" ")[1]}` : "Sin sesiones próximas"}
              />
              <Dato valor={sesiones.length} texto={sesiones.length === 1 ? "sesión hasta hoy" : "sesiones hasta hoy"} />
            </div>

            {/* Próximos turnos */}
            <section className="rounded-2xl border border-borde bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-dorado">
                <CalendarDays className="h-5 w-5" /> Próximas sesiones
              </h2>
              {proximos.length === 0 ? (
                <p className="text-sm text-tenue">No tenés sesiones programadas. Pedile una a tu psicólogo/a o a la recepción.</p>
              ) : (
                <ul className="space-y-2">
                  {proximos.map((t) => {
                    const remota = t.modalidad?.nombre === "Remota";
                    const puedeReprogramar = new Date(t.fechaHoraInicio).getTime() - Date.now() >= UN_DIA;
                    return (
                      <li key={t.id} className="rounded-xl border border-foreground/10 bg-background px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            {esManana(t.fechaHoraInicio) ? <Sun className="mt-0.5 h-4 w-4 text-dorado" /> : <Moon className="mt-0.5 h-4 w-4 text-dorado" />}
                            <div>
                              <p className="font-medium text-foreground first-letter:uppercase">{fecha(t.fechaHoraInicio)}</p>
                              <p className="text-sm text-suave">
                                {horaDelConsultorio(t.fechaHoraInicio)} a {horaDelConsultorio(t.fechaHoraFin)} · {remota ? "Videollamada" : "Presencial"}
                                {nombrePsicologo(t) && ` · con ${nombrePsicologo(t)}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={colorEstado(t.estado?.nombre)}>{t.estado?.nombre}</Badge>
                        </div>
                        {((remota && t.enlaceVideollamada) || puedeReprogramar) && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-borde/60 pt-3">
                            {remota && t.enlaceVideollamada && (
                              <Button asChild size="sm" className="h-8 gap-1.5 rounded-full bg-primary text-primary-foreground">
                                <a href={t.enlaceVideollamada} target="_blank" rel="noopener noreferrer"><Video className="h-3.5 w-3.5" />Entrar a la videollamada</a>
                              </Button>
                            )}
                            {puedeReprogramar && (
                              <Button size="sm" variant="outline" onClick={() => setReprogramar(t)} className="h-8 gap-1.5 rounded-full border-dorado/60 text-dorado">
                                <CalendarClock className="h-3.5 w-3.5" />Reprogramar
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-tenue">Podés reprogramar una sesión hasta 24 horas antes. Como máximo tenés 2 sesiones por semana, en días distintos.</p>
            </section>

            {/* Sesiones que tuvo */}
            <section className="rounded-2xl border border-borde bg-card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-dorado">
                <HeartHandshake className="h-5 w-5" /> Sesiones que tuviste
              </h2>
              <p className="mb-4 text-sm text-tenue">Del primer día al último.</p>
              {sesiones.length === 0 ? (
                <p className="text-sm text-tenue">Todavía no tuviste sesiones.</p>
              ) : (
                <ol className="space-y-2">
                  {sesiones.map((s) => {
                    const t = s.turnos[0];
                    return (
                      <li key={s.dia} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            Sesión {s.numero} <span className="font-normal text-suave">· {diaLargo(s.dia)}</span>
                          </p>
                          {t && (
                            <p className="text-sm text-suave">
                              {horaDelConsultorio(t.inicio)} · {t.modalidad === "Remota" ? "Videollamada" : "Presencial"}
                              {nombrePsicologo(t) && ` · con ${nombrePsicologo(t)}`}
                            </p>
                          )}
                        </div>
                        {s.seguimientos[0] ? (
                          <Link href={`/informes/seguimiento?abrir=${s.seguimientos[0].id}`} className="flex items-center gap-1.5 text-sm font-semibold text-dorado hover:underline">
                            <ClipboardCheck className="h-4 w-4" /> Ver seguimiento
                          </Link>
                        ) : (
                          <span className="text-xs text-tenue">Sin seguimiento</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Seguimientos */}
            <section className="rounded-2xl border border-borde bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-dorado">
                <ClipboardCheck className="h-5 w-5" /> Mis seguimientos
              </h2>
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
                  <Button variant="ghost" onClick={() => { setDesde(""); setHasta(""); }} className="text-suave">Ver todos</Button>
                )}
              </div>
              {seguimientosFiltrados.length === 0 ? (
                <p className="py-4 text-center text-sm text-tenue">
                  {seguimientos.length === 0 ? "Tu psicólogo/a todavía no te compartió informes de seguimiento." : "No hay seguimientos entre esas fechas."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {seguimientosFiltrados.map((s) => {
                    const hechas = s.actividades.filter((a) => a.respuesta === "HECHA").length;
                    const pendientes = s.actividades.filter((a) => !a.respuesta).length;
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/informes/seguimiento?abrir=${s.id}`}
                          className="block rounded-xl border border-foreground/10 bg-background px-4 py-3 transition-colors hover:border-primary/50"
                        >
                          <p className="font-medium text-foreground first-letter:uppercase">{fecha(s.fechaSesion)}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-texto-2">{s.resumen}</p>
                          {s.actividades.length > 0 && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-suave">
                              <Check className="h-3.5 w-3.5 text-exito" />
                              {hechas} de {s.actividades.length} actividades hechas
                              {pendientes > 0 && <span className="text-aviso">· {pendientes} sin responder</span>}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <DialogoReprogramar sesion={reprogramar} onClose={() => setReprogramar(null)} onReprogramada={cargar} />
    </div>
  );
}
