// src/components/pacientes/DialogoPacienteNuevo.tsx
// Alta rápida de un paciente que todavía no está en el sistema (por ejemplo, alguien que viene
// por primera vez y paga particular). Se usa desde la nota clínica y desde el registro de turnos.
// El paciente se crea sin cuenta: para atenderlo no necesita email ni contraseña.
"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { avisoExito } from "@/lib/avisos";
import { AYUDA_CELULAR } from "@/lib/telefono";

export interface PacienteCreado {
  id: string;
  persona: { nombre: string; apellido: string; dni: string; nombreCompleto: string };
}

interface ObraSocial {
  id: string | number;
  nombre: string;
}

const VACIO = { nombre: "", apellido: "", dni: "", fechaNacimiento: "", telefono: "", obraSocialId: "" };

// Lo que se escribió en el buscador sirve para no tipear dos veces: números -> DNI; texto -> nombre y apellido
function desdeBusqueda(texto: string) {
  const t = texto.trim();
  if (!t) return {};
  if (/^\d[\d.\s]*$/.test(t)) return { dni: t.replace(/\D/g, "") };
  const partes = t.split(/\s+/);
  return partes.length > 1 ? { nombre: partes.slice(0, -1).join(" "), apellido: partes[partes.length - 1] } : { nombre: t };
}

export default function DialogoPacienteNuevo({
  abierto,
  busqueda = "",
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  busqueda?: string;
  onCerrar: () => void;
  onListo: (paciente: PacienteCreado) => void;
}) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [existente, setExistente] = useState<PacienteCreado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [obras, setObras] = useState<ObraSocial[]>([]);

  // Al abrir: datos limpios, lo escrito en el buscador y "Particular" elegida
  useEffect(() => {
    if (!abierto) return;
    setDatos({ ...VACIO, ...desdeBusqueda(busqueda) });
    setErrores({});
    setError("");
    setExistente(null);
    fetch("/api/obras-sociales")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: ObraSocial[]) => {
        setObras(lista);
        const particular = lista.find((o) => o.nombre === "Particular");
        if (particular) setDatos((d) => ({ ...d, obraSocialId: d.obraSocialId || String(particular.id) }));
      })
      .catch(() => setObras([]));
  }, [abierto, busqueda]);

  const cambiar = (campo: keyof typeof VACIO, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: "" }));
    if (campo === "dni") setExistente(null);
  };

  const guardar = async () => {
    setGuardando(true);
    setError("");
    setExistente(null);
    try {
      const r = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const respuesta = await r.json().catch(() => null);
      if (r.status === 201) {
        avisoExito(`Paciente ${respuesta.persona.nombreCompleto} registrado.`);
        onListo(respuesta);
        return;
      }
      if (r.status === 409 && respuesta?.existente) {
        setExistente(respuesta.existente);
        return;
      }
      setErrores(respuesta?.errores ?? {});
      setError(respuesta?.error ?? "No se pudo registrar el paciente.");
    } catch {
      setError("Error de conexión. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = (id: keyof typeof VACIO, etiqueta: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pn-${id}`} className="text-texto-2">{etiqueta}</Label>
      <Input
        id={`pn-${id}`}
        value={datos[id]}
        onChange={(e) => cambiar(id, e.target.value)}
        className={`border-borde-fuerte bg-background text-foreground ${errores[id] ? "border-red-500" : ""}`}
        {...props}
      />
      {errores[id] && <p className="text-xs text-peligro">{errores[id]}</p>}
    </div>
  );

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-[480px] sm:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--borde)" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="h-5 w-5 text-dorado" />
            Paciente nuevo
          </DialogTitle>
          <DialogDescription className="text-suave">
            Para quien viene por primera vez. Se registra sin cuenta: no necesita email ni contraseña.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {campo("nombre", "Nombre", { autoFocus: true, autoComplete: "off" })}
            {campo("apellido", "Apellido", { autoComplete: "off" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {campo("dni", "DNI", { inputMode: "numeric", placeholder: "Sin puntos", autoComplete: "off" })}
            {campo("fechaNacimiento", "Fecha de nacimiento", { type: "date", max: new Date().toISOString().slice(0, 10) })}
          </div>
          {campo("telefono", "Celular (opcional)", { inputMode: "tel", placeholder: "3704 123456", autoComplete: "off" })}
          {!errores.telefono && <p className="-mt-3 text-xs text-tenue">{AYUDA_CELULAR}</p>}

          <div className="space-y-1.5">
            <Label className="text-texto-2">Obra social</Label>
            <Select value={datos.obraSocialId} onValueChange={(v) => cambiar("obraSocialId", v)}>
              <SelectTrigger className="border-borde-fuerte bg-background text-foreground">
                <SelectValue placeholder="Particular" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.nombre === "Particular" ? "Particular (paga la sesión)" : o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {existente && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="text-foreground">
                Ya hay un paciente con ese DNI: <strong>{existente.persona.nombreCompleto}</strong>.
              </p>
              <Button type="button" size="sm" className="mt-2 bg-primary text-primary-foreground" onClick={() => onListo(existente)}>
                Usar este paciente
              </Button>
            </div>
          )}
          {error && !existente && <p className="text-sm text-peligro">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={guardando} className="bg-primary text-primary-foreground">
            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Registrar paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
