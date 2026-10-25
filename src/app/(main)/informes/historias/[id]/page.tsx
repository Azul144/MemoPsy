// src/app/(main)/informes/historias/[id]/page.tsx
// Historia clínica de un paciente ([id] = id del paciente): admisión, evolución y cierre.
// La evolución no se escribe acá: son las notas clínicas del psicólogo sobre este paciente.
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, Loader2, Lock, NotebookPen, Save } from "lucide-react";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import DictadoVoz from "@/components/sistema/DictadoVoz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  APARTADOS_ADMISION,
  CAMPOS_IDENTIFICACION,
  CAMPOS_TEXTO_HISTORIA,
  MOTIVOS_CIERRE,
  NOMBRE_MOTIVO_CIERRE,
  edadEn,
  type CampoTextoHistoria,
  type MotivoCierre,
} from "@/lib/historia-clinica/apartados";

interface DatosPagina {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string | null;
    telefono: string | null;
    obraSocial: string | null;
  };
  psicologo: { nombre: string; especialidad: string | null; licencia: string | null };
  historia: (Record<CampoTextoHistoria, string | null> & {
    id: string;
    fechaAdmision: string;
    consentimientoInformado: boolean | number;
    fechaConsentimiento: string | null;
    fechaCierre: string | null;
    motivoCierre: MotivoCierre | null;
  }) | null;
  evoluciones: { id: string; titulo: string; contenido: string; fecha: string }[];
}

type Formulario = Record<CampoTextoHistoria, string> & {
  fechaAdmision: string;
  consentimientoInformado: boolean;
  fechaConsentimiento: string;
  fechaCierre: string;
  motivoCierre: MotivoCierre | "";
};

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const fechaDia = (f: string) => f.slice(0, 10).split("-").reverse().join("/");
const fechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));

function formularioDesde(historia: DatosPagina["historia"]): Formulario {
  const textos = Object.fromEntries(CAMPOS_TEXTO_HISTORIA.map((c) => [c, historia?.[c] ?? ""])) as Record<CampoTextoHistoria, string>;
  return {
    ...textos,
    fechaAdmision: historia?.fechaAdmision?.slice(0, 10) ?? hoy(),
    consentimientoInformado: Boolean(historia?.consentimientoInformado),
    fechaConsentimiento: historia?.fechaConsentimiento?.slice(0, 10) ?? "",
    fechaCierre: historia?.fechaCierre?.slice(0, 10) ?? "",
    motivoCierre: historia?.motivoCierre ?? "",
  };
}

const estiloCampo = "bg-background text-foreground border-borde-fuerte focus:border-dorado";

function Seccion({ numero, titulo, children, descripcion }: { numero: number; titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-borde bg-card p-6">
      <h2 className="text-xl font-semibold text-dorado">
        {numero}. {titulo}
      </h2>
      {descripcion && <p className="mt-1 text-sm text-tenue">{descripcion}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export default function HistoriaClinicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [datos, setDatos] = useState<DatosPagina | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambios, setCambios] = useState(false);

  useEffect(() => {
    fetch(`/api/historias-clinicas/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.message || d?.error || "No se pudo cargar la historia clínica.");
        setDatos(d);
        setForm(formularioDesde(d.historia));
      })
      .catch((e: Error) => setErrorCarga(e.message));
  }, [id]);

  // Aviso del navegador si se quiere salir con cambios sin guardar
  useEffect(() => {
    if (!cambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [cambios]);

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
    setCambios(true);
    setMensaje(null);
  };
  const agregarDictado = (campo: CampoTextoHistoria) => (texto: string) => {
    setForm((f) => {
      if (!f) return f;
      const actual = f[campo];
      return { ...f, [campo]: actual ? `${actual}${/\s$/.test(actual) ? "" : " "}${texto}` : texto };
    });
    setCambios(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await fetch(`/api/historias-clinicas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fechaConsentimiento: form.fechaConsentimiento || null,
          fechaCierre: form.fechaCierre || null,
          motivoCierre: form.motivoCierre || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: d.message || d.error || `No se pudo guardar (error ${r.status}).` });
        return;
      }
      setDatos((prev) => (prev && !prev.historia ? { ...prev, historia: { ...(form as any), id: d.id } } : prev));
      setCambios(false);
      setMensaje({ tipo: "ok", texto: d.nueva ? "Historia clínica abierta y guardada." : "Cambios guardados." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión. Probá de nuevo." });
    } finally {
      setGuardando(false);
    }
  };

  if (errorCarga) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <EncabezadoPagina titulo="Historia clínica" volverA="/informes/historias" textoVolver="Volver a Historias clínicas" />
        <div className="flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-peligro">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errorCarga}
        </div>
      </main>
    );
  }

  if (!datos || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-suave">
        <Loader2 className="h-6 w-6 animate-spin text-dorado" />
        Cargando historia clínica...
      </div>
    );
  }

  const { paciente, psicologo, evoluciones } = datos;
  const tieneHistoria = Boolean(datos.historia);
  const edad = paciente.fechaNacimiento ? edadEn(paciente.fechaNacimiento) : null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <EncabezadoPagina
          titulo={`${paciente.apellido}, ${paciente.nombre}`}
          descripcion={tieneHistoria ? "Historia clínica psicológica" : "Esta persona todavía no tiene historia clínica: completá la admisión y guardala para abrirla."}
          volverA="/informes/historias"
          textoVolver="Volver a Historias clínicas"
        >
          {tieneHistoria && (
            <Button asChild className="bg-primary text-primary-foreground hover:bg-opacity-80">
              <a href={`/api/historias-clinicas/${id}/pdf`}>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </a>
            </Button>
          )}
        </EncabezadoPagina>

        <p className="mb-6 flex items-start gap-2 rounded-md border border-borde bg-background p-3 text-sm text-suave">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
          La historia clínica se guarda cifrada y solo la ves vos. Cada consulta, cambio y descarga queda registrado en la auditoría (Ley 26.529 y Ley 25.326).
        </p>

        <form onSubmit={guardar} className="space-y-6">
          <Seccion numero={1} titulo="Datos de identificación" descripcion="Los datos personales salen de la ficha del paciente.">
            <dl className="grid gap-x-6 gap-y-3 rounded-md border border-borde bg-background p-4 text-sm sm:grid-cols-2">
              {[
                ["DNI", paciente.dni],
                ["Fecha de nacimiento", paciente.fechaNacimiento ? `${fechaDia(paciente.fechaNacimiento)}${edad !== null ? ` (${edad} años)` : ""}` : "-"],
                ["Teléfono", paciente.telefono || "-"],
                ["Obra social", paciente.obraSocial || "-"],
                ["Profesional tratante", [psicologo.nombre, psicologo.especialidad, psicologo.licencia].filter(Boolean).join(" · ")],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-xs uppercase tracking-wide text-tenue">{rotulo}</dt>
                  <dd className="text-foreground">{valor}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaAdmision" className="text-texto-2">Fecha de admisión</Label>
                <Input
                  id="fechaAdmision"
                  type="date"
                  required
                  value={form.fechaAdmision}
                  onChange={(e) => cambiar("fechaAdmision", e.target.value)}
                  className={estiloCampo}
                />
              </div>
              {CAMPOS_IDENTIFICACION.map(({ campo, titulo, ayuda }) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={campo} className="text-texto-2">{titulo}</Label>
                  <Input id={campo} value={form[campo]} placeholder={ayuda} onChange={(e) => cambiar(campo, e.target.value)} className={estiloCampo} />
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion numero={2} titulo="Admisión" descripcion="Podés escribir o dictar cada apartado.">
            {APARTADOS_ADMISION.map(({ campo, titulo, ayuda }) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={campo} className="text-texto-2">{titulo}</Label>
                <Textarea
                  id={campo}
                  rows={4}
                  value={form[campo]}
                  placeholder={ayuda}
                  onChange={(e) => cambiar(campo, e.target.value)}
                  className={estiloCampo}
                />
                <DictadoVoz onTexto={agregarDictado(campo)} disabled={guardando} />
              </div>
            ))}
            <div className="rounded-md border border-borde bg-background p-4">
              <label className="flex items-start gap-3 text-sm text-texto-2">
                <input
                  type="checkbox"
                  checked={form.consentimientoInformado}
                  onChange={(e) => {
                    cambiar("consentimientoInformado", e.target.checked);
                    if (e.target.checked && !form.fechaConsentimiento) cambiar("fechaConsentimiento", form.fechaAdmision);
                  }}
                  className="mt-0.5 h-4 w-4 accent-dorado"
                />
                <span>
                  <span className="font-medium text-foreground">Consentimiento informado</span>
                  <span className="block text-tenue">
                    El paciente (o su representante, si es menor) firmó el consentimiento para el tratamiento y el registro de sus datos.
                  </span>
                </span>
              </label>
              {form.consentimientoInformado && (
                <div className="mt-3 max-w-xs space-y-2 pl-7">
                  <Label htmlFor="fechaConsentimiento" className="text-texto-2">Fecha del consentimiento</Label>
                  <Input
                    id="fechaConsentimiento"
                    type="date"
                    value={form.fechaConsentimiento}
                    onChange={(e) => cambiar("fechaConsentimiento", e.target.value)}
                    className={estiloCampo}
                  />
                </div>
              )}
            </div>
          </Seccion>

          <Seccion
            numero={3}
            titulo="Evolución"
            descripcion="Son tus notas clínicas sobre este paciente, en orden de fecha. Para agregar una sesión, registrá una nota nueva."
          >
            {evoluciones.length === 0 ? (
              <p className="text-sm text-tenue">Todavía no hay notas clínicas de este paciente.</p>
            ) : (
              <ol className="space-y-3">
                {evoluciones.map((n) => (
                  <li key={n.id} className="rounded-md border border-borde bg-background p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-foreground">{n.titulo}</p>
                      <p className="text-xs text-tenue">{fechaHora(n.fecha)}</p>
                    </div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-suave">{n.contenido}</p>
                    <Link href={`/informes/detalle/${n.id}`} className="mt-2 inline-block text-sm text-dorado hover:underline">
                      Ver nota completa
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <Button asChild variant="outline" size="sm" className="border-dorado text-dorado hover:bg-primary hover:text-primary-foreground">
              <Link href="/informes/registrar">
                <NotebookPen className="mr-2 h-4 w-4" />
                Registrar nota de sesión
              </Link>
            </Button>
          </Seccion>

          <Seccion numero={4} titulo="Cierre del tratamiento" descripcion="Completalo solo cuando termine el tratamiento. Mientras tanto, la historia queda en curso.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaCierre" className="text-texto-2">Fecha de cierre</Label>
                <Input id="fechaCierre" type="date" value={form.fechaCierre} onChange={(e) => cambiar("fechaCierre", e.target.value)} className={estiloCampo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivoCierre" className="text-texto-2">Motivo</Label>
                <select
                  id="motivoCierre"
                  value={form.motivoCierre}
                  onChange={(e) => cambiar("motivoCierre", e.target.value as MotivoCierre | "")}
                  className={`h-10 w-full rounded-md border px-3 text-sm ${estiloCampo}`}
                >
                  <option value="">Sin cerrar</option>
                  {MOTIVOS_CIERRE.map((m) => (
                    <option key={m} value={m}>
                      {NOMBRE_MOTIVO_CIERRE[m]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="epicrisis" className="text-texto-2">Epicrisis</Label>
              <Textarea
                id="epicrisis"
                rows={4}
                value={form.epicrisis}
                placeholder="Resumen del tratamiento: evolución, logros, estado al cierre y recomendaciones."
                onChange={(e) => cambiar("epicrisis", e.target.value)}
                className={estiloCampo}
              />
              <DictadoVoz onTexto={agregarDictado("epicrisis")} disabled={guardando} />
            </div>
          </Seccion>

          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-borde bg-card p-4">
            {mensaje && (
              <p className={`mr-auto flex items-center gap-2 text-sm ${mensaje.tipo === "ok" ? "text-exito" : "text-aviso"}`}>
                {mensaje.tipo === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {mensaje.texto}
              </p>
            )}
            {!mensaje && cambios && <p className="mr-auto text-sm text-tenue">Hay cambios sin guardar.</p>}
            <Button type="submit" disabled={guardando} className="bg-primary text-primary-foreground hover:bg-opacity-80">
              {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {tieneHistoria ? "Guardar cambios" : "Abrir historia clínica"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
