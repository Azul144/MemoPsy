// src/app/(auth)/reset-password/page.tsx
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import PantallaAcceso from "@/components/PantallaAcceso";
import { Button } from "@/components/ui/button";
import InputPassword from "@/components/InputPassword";
import { Label } from "@/components/ui/label";
import RequisitosPassword from "@/components/RequisitosPassword";
import { validarPassword } from "@/lib/validaciones/password";

// Next pide envolver en <Suspense> a los componentes que leen la URL con useSearchParams
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <FormularioNuevaPassword />
    </Suspense>
  );
}

function FormularioNuevaPassword() {
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cumpleRequisitos = validarPassword(password).length === 0;
  const coinciden = password.length > 0 && password === confirmacion;

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores([]);
    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setListo(true);
      } else {
        setErrores([datos.message, ...(datos.errores ?? [])]);
      }
    } catch {
      setErrores(["No se pudo conectar. Revisá tu conexión e intentá de nuevo."]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaAcceso>

        {!token ? (
          <div className="mt-6">
            <p className="text-foreground/90">Este enlace no es válido.</p>
            <Link href="/olvide-password" className="mt-4 inline-block text-dorado underline">Pedir un enlace nuevo</Link>
          </div>
        ) : listo ? (
          <div className="mt-6">
            <CheckCircle2 className="h-10 w-10 text-dorado" aria-hidden="true" />
            <p role="status" className="mt-3 text-foreground/90">Tu contraseña se actualizó.</p>
            <Link href="/login" className="mt-6 inline-block text-dorado underline">Iniciar sesión</Link>
          </div>
        ) : (
          <>
            <h1 className="mt-4 mb-6 titulo text-3xl text-crema">Elegí tu contraseña nueva</h1>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <Label htmlFor="password">Contraseña nueva</Label>
                <InputPassword
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="requisitos"
                  disabled={cargando}
                  className="mt-1"
                />
                <div id="requisitos">
                  <RequisitosPassword password={password} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirmacion">Repetí la contraseña</Label>
                <InputPassword
                  id="confirmacion"
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  disabled={cargando}
                  className="mt-1"
                />
                {confirmacion.length > 0 && !coinciden && (
                  <p className="mt-1 text-sm text-peligro">Las contraseñas no coinciden.</p>
                )}
              </div>

              {errores.length > 0 && (
                <ul role="alert" className="space-y-1 text-sm text-peligro">
                  {errores.map((error) => <li key={error}>{error}</li>)}
                </ul>
              )}

              <Button type="submit" className="w-full" disabled={!cumpleRequisitos || !coinciden || cargando}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contraseña
              </Button>
            </form>
          </>
        )}
    </PantallaAcceso>
  );
}
