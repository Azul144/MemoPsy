// src/app/(auth)/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Traduce los códigos de error del servidor a mensajes para el usuario
const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos.",
  CUENTA_BLOQUEADA: "Demasiados intentos fallidos. Esperá 15 minutos y volvé a intentar.",
  CUENTA_INACTIVA: "Tu cuenta está desactivada. Contactá al administrador del consultorio.",
  CODIGO_INVALIDO: "El código no es correcto. Revisá tu app de autenticación.",
};

export default function LoginPage() {
  const router = useRouter();

  // "credenciales" = pide email y contraseña / "codigo" = pide el código de 6 dígitos
  const [paso, setPaso] = useState<"credenciales" | "codigo">("credenciales");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const resultado = await signIn("credentials", {
      redirect: false,
      email,
      password,
      codigo: paso === "codigo" ? codigo : "",
    });

    setCargando(false);

    if (resultado?.ok && !resultado.error) {
      router.push("/welcome");
      router.refresh();
      return;
    }

    if (resultado?.error === "MFA_REQUERIDO") {
      // La contraseña es correcta y el usuario tiene MFA: pedimos el código
      setPaso("codigo");
      return;
    }

    setError(MENSAJES_ERROR[resultado?.error ?? ""] ?? "No se pudo iniciar sesión. Intentá de nuevo.");
    if (paso === "codigo") setCodigo("");
  }

  function volver() {
    setPaso("credenciales");
    setPassword("");
    setCodigo("");
    setError(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <MemopsyLogo />

        {paso === "credenciales" ? (
          <>
            <h1 className="mt-4 mb-6 text-center text-2xl font-bold text-primary">Iniciar Sesión</h1>
            <form onSubmit={ingresar} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={cargando}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={cargando}
                  className="mt-1"
                />
              </div>

              {error && <p role="alert" className="text-center text-sm text-red-300">{error}</p>}

              <Button type="submit" className="w-full" disabled={cargando}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm">
              <Link href="/olvide-password" className="text-primary underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mt-4 mb-6 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h1 className="mt-2 text-2xl font-bold text-primary">Verificación en dos pasos</h1>
              <p className="mt-2 text-sm text-white/80">
                Abrí tu app de autenticación e ingresá el código de 6 dígitos.
                También podés usar uno de tus códigos de recuperación.
              </p>
            </div>
            <form onSubmit={ingresar} className="space-y-4">
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  disabled={cargando}
                  className="mt-1 text-center text-lg tracking-widest"
                />
              </div>

              {error && <p role="alert" className="text-center text-sm text-red-300">{error}</p>}

              <Button type="submit" className="w-full" disabled={cargando}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={volver} disabled={cargando}>
                Volver
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}