// src/components/mfa-desactivar-modal.tsx
// Ventana para DESACTIVAR la verificación en dos pasos.
// Pide un código (de la app o de recuperación): no alcanza con tener la sesión abierta.
"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MfaDesactivarModal({ isOpen, onClose, onSuccess }: Props) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function desactivar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code: codigo }),
      });
      const datos = await respuesta.json();
      if (datos.success) {
        setCodigo("");
        onSuccess();
      } else {
        setError(datos.error ?? "No se pudo desactivar.");
        setCodigo("");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  function cerrar() {
    setCodigo("");
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-desactivar"
        className="w-full max-w-md rounded-2xl bg-card p-6 text-foreground shadow-xl"
      >
        <h2 id="titulo-desactivar" className="mb-2 text-center text-xl font-bold text-dorado">
          Desactivar verificación en dos pasos
        </h2>
        <p className="mb-4 text-center text-sm text-foreground/80">
          Para confirmar que sos vos, escribí el código de tu app de autenticación o uno de tus
          códigos de recuperación.
        </p>
        <form onSubmit={desactivar} className="space-y-4">
          <div>
            <Label htmlFor="codigo-desactivar">Código</Label>
            <Input
              id="codigo-desactivar"
              autoComplete="one-time-code"
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="mt-1 text-center text-lg tracking-widest"
              required
            />
          </div>
          {error && <p role="alert" className="text-center text-sm text-peligro">{error}</p>}
          <Button type="submit" className="w-full" disabled={!codigo || cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desactivar
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={cerrar} disabled={cargando}>
            Cancelar
          </Button>
        </form>
      </div>
    </div>
  );
}
