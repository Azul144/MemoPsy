// src/components/mfa-setup-modal.tsx
// Ventana para ACTIVAR la verificación en dos pasos:
// 1) escanear el QR  2) escribir el código de la app  3) guardar los códigos de recuperación
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Paso = "cargando" | "qr" | "codigos" | "error";

export default function ModalActivarMfa({ isOpen, onClose, onSuccess }: Props) {
  const [paso, setPaso] = useState<Paso>("cargando");
  const [qr, setQr] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigosRecuperacion, setCodigosRecuperacion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Evita pedir el QR dos veces (React, en modo desarrollo, ejecuta los efectos dos veces)
  const yaPedido = useRef(false);

  // Al abrir la ventana, pedimos al servidor un secreto nuevo y su QR
  useEffect(() => {
    if (!isOpen) {
      yaPedido.current = false; // al cerrar, la próxima apertura vuelve a pedirlo
      return;
    }
    if (yaPedido.current) return;
    yaPedido.current = true;

    setPaso("cargando");
    setCodigo("");
    setError(null);
    fetch("/api/auth/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable" }),
    })
      .then((r) => r.json())
      .then((datos) => {
        if (datos.success) {
          setQr(datos.qrCode);
          setSecreto(datos.secret);
          setPaso("qr");
        } else {
          setError(datos.error ?? "No se pudo iniciar la configuración.");
          setPaso("error");
        }
      })
      .catch(() => {
        setError("No se pudo conectar con el servidor.");
        setPaso("error");
      });
  }, [isOpen]);

  async function verificar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setVerificando(true);
    try {
      const respuesta = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: codigo }),
      });
      const datos = await respuesta.json();
      if (datos.success) {
        setCodigosRecuperacion(datos.codigosRecuperacion);
        setPaso("codigos");
      } else {
        setError(datos.error ?? "El código no es correcto.");
        setCodigo("");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setVerificando(false);
    }
  }

  async function copiarCodigos() {
    try {
      await navigator.clipboard.writeText(codigosRecuperacion.join("\n"));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  function descargarCodigos() {
    const texto = `Códigos de recuperación de MemoPsy\nCada código sirve una sola vez.\n\n${codigosRecuperacion.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "memopsy-codigos-recuperacion.txt";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-mfa"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 text-foreground shadow-xl"
      >
        <h2 id="titulo-mfa" className="mb-4 text-center text-xl font-bold text-dorado">
          Activar verificación en dos pasos
        </h2>

        {paso === "cargando" && (
          <div className="flex h-48 flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-dorado" />
            <p className="mt-2 text-foreground/80">Generando configuración…</p>
          </div>
        )}

        {paso === "error" && (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-peligro">{error}</p>
            <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
          </div>
        )}

        {paso === "qr" && (
          <form onSubmit={verificar} className="space-y-4">
            <p className="text-sm text-foreground/85">
              <strong>1.</strong> Abrí una app de autenticación (Google Authenticator, Microsoft
              Authenticator, Authy…) y escaneá este código:
            </p>
            {/* El QR viene como imagen (data URL) generada en el servidor */}
            <img
              src={qr}
              alt="Código QR para configurar la app de autenticación"
              width={240}
              height={240}
              className="mx-auto rounded-lg bg-white p-2"
            />
            <p className="text-xs text-foreground/70">Si no podés escanearlo, cargá esta clave a mano:</p>
            <p className="break-all rounded bg-secondary p-2 text-center font-mono text-sm">{secreto}</p>

            <div>
              <Label htmlFor="codigo-activacion" className="text-sm text-foreground/85">
                <strong>2.</strong> Escribí el código de 6 dígitos que muestra la app:
              </Label>
              <Input
                id="codigo-activacion"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="mt-2 text-center text-lg tracking-widest"
                required
              />
            </div>

            {error && <p role="alert" className="text-center text-sm text-peligro">{error}</p>}

            <Button type="submit" className="w-full" disabled={codigo.length !== 6 || verificando}>
              {verificando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activar
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
          </form>
        )}

        {paso === "codigos" && (
          <div className="space-y-4">
            <div className="text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-dorado" aria-hidden="true" />
              <p className="mt-2 font-semibold">¡Listo! La verificación en dos pasos quedó activada.</p>
            </div>
            <p className="text-sm text-foreground/85">
              Guardá estos <strong>códigos de recuperación</strong> en un lugar seguro. Si perdés el
              celular, cada uno te deja entrar <strong>una sola vez</strong>.
              <strong> No se vuelven a mostrar.</strong>
            </p>
            <ul className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-4 text-center font-mono">
              {codigosRecuperacion.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={copiarCodigos}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                {copiado ? "¡Copiados!" : "Copiar"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={descargarCodigos}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Descargar
              </Button>
            </div>
            <Button type="button" className="w-full" onClick={onSuccess}>
              Ya los guardé
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
