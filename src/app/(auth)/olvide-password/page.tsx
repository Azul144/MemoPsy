// src/app/(auth)/olvide-password/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import PantallaAcceso from "@/components/acceso/PantallaAcceso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esEmailValido } from "@/lib/validaciones/password";

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!esEmailValido(email)) {
      setError("Ingresá un email válido, por ejemplo nombre@dominio.com");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/olvide-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setMensaje(datos.message);
      } else {
        setError(datos.message ?? "No se pudo enviar la solicitud.");
      }
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaAcceso>
        <h1 className="mt-4 titulo text-3xl text-crema">¿Olvidaste tu contraseña?</h1>

        {mensaje ? (
          <div className="mt-6">
            <Mail className="h-10 w-10 text-dorado" aria-hidden="true" />
            <p role="status" className="mt-3 text-foreground/90">{mensaje}</p>
            <p className="mt-2 text-sm text-foreground/70">Revisá también la carpeta de spam. El enlace vence en 30 minutos.</p>
            <Link href="/login" className="mt-6 inline-block text-dorado underline">Volver al inicio de sesión</Link>
          </div>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-foreground/80">
              Escribí el email de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
            </p>
            <form onSubmit={enviar} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={cargando}
                  className="mt-1"
                />
              </div>

              {error && <p role="alert" className="text-sm text-peligro">{error}</p>}

              <Button type="submit" className="w-full" disabled={cargando}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar enlace
              </Button>
            </form>
            <p className="mt-6 text-sm">
              <Link href="/login" className="text-dorado underline">Volver al inicio de sesión</Link>
            </p>
          </>
        )}
    </PantallaAcceso>
  );
}
