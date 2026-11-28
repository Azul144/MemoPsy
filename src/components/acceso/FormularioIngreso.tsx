// src/components/acceso/FormularioIngreso.tsx
// Formulario de inicio de sesión. Lo usan dos direcciones:
//   /login     -> la del consultorio (psicólogo, recepción, administración, auditoría), con vuelta a la portada
//   /pacientes -> el enlace fijo del paciente: solo el formulario, sin «Volver al inicio»
// Las dos validan igual; lo que cada uno ve después depende de su rol.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import PantallaAcceso from "@/components/acceso/PantallaAcceso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InputPassword from "@/components/acceso/InputPassword";
import { Label } from "@/components/ui/label";

// Traduce los códigos de error del servidor a mensajes para el usuario
const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos.",
  CUENTA_BLOQUEADA: "Demasiados intentos fallidos. Esperá 15 minutos y volvé a intentar.",
  CUENTA_INACTIVA: "Tu cuenta está desactivada. Contactá al administrador del consultorio.",
  CODIGO_INVALIDO: "El código no es correcto. Revisá tu app de autenticación.",
};

// Email que /login le pasa a /pacientes cuando una cuenta de paciente entró por el acceso del consultorio
// (en sessionStorage y no en la dirección, para que el email no quede en el historial)
const EMAIL_PARA_PACIENTES = "memopsy_email_paciente";

// Etiquetas en crema suave: así resalta lo que se escribe en el campo y no la etiqueta
const ETIQUETA = { color: "color-mix(in srgb, var(--crema) 75%, transparent)" };

export default function FormularioIngreso({ paraPaciente = false }: { paraPaciente?: boolean }) {
  const router = useRouter();

  // "credenciales" = pide email y contraseña / "codigo" = pide el código de 6 dígitos
  const [paso, setPaso] = useState<"credenciales" | "codigo">("credenciales");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Llega desde /login: el email ya viene escrito
  useEffect(() => {
    if (!paraPaciente) return;
    const guardado = sessionStorage.getItem(EMAIL_PARA_PACIENTES);
    if (guardado) {
      setEmail(guardado);
      setAviso("Esta es tu entrada como paciente. Ingresá de nuevo tu contraseña.");
      sessionStorage.removeItem(EMAIL_PARA_PACIENTES);
    }
  }, [paraPaciente]);

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);

    const resultado = await signIn("credentials", {
      redirect: false,
      email,
      password,
      codigo: paso === "codigo" ? codigo : "",
      acceso: paraPaciente ? "paciente" : "consultorio",
    });

    setCargando(false);

    if (resultado?.ok && !resultado.error) {
      // Recuerda en este dispositivo que la cuenta es de un paciente: si la sesión vence,
      // el sistema lo manda a /pacientes (su acceso) y no a /login
      const sesion = await getSession();
      document.cookie = sesion?.user?.pacienteId
        ? "memopsy_acceso=paciente; path=/; max-age=31536000; samesite=lax"
        : "memopsy_acceso=; path=/; max-age=0; samesite=lax";
      router.replace("/welcome"); // reemplaza el login en el historial
      router.refresh();
      return;
    }

    if (resultado?.error === "ES_PACIENTE") {
      // Cuenta de paciente en el acceso del consultorio: no entra por acá, va a /pacientes
      setCargando(true);
      setAviso("Esta cuenta es de paciente. Te llevamos a tu acceso…");
      sessionStorage.setItem(EMAIL_PARA_PACIENTES, email);
      setTimeout(() => router.replace("/pacientes"), 1800);
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
    <PantallaAcceso paraPaciente={paraPaciente}>

        {paso === "credenciales" ? (
          <>
            <h1 className="mt-4 titulo text-3xl text-crema">{paraPaciente ? "Acceso para pacientes" : "Iniciar sesión"}</h1>
            <p className="mt-2 mb-7 text-crema/70">
              {paraPaciente ? "Ingresá con el email y la contraseña que creaste." : "Ingresá con tu cuenta de MemoPsy."}
            </p>
            <form onSubmit={ingresar} className="space-y-5">
              <div>
                <Label htmlFor="email" style={ETIQUETA}>Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  // "username" (y no "email"): así el llavero del iPhone y el administrador de contraseñas
                  // de Google reconocen la cuenta, ofrecen guardarla y la completan con Face ID o la huella
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={cargando}
                  className="mt-1"
                />
              </div>
              <div>
                {/* El enlace para recuperar la contraseña va en la misma línea que la etiqueta */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" style={ETIQUETA}>Contraseña</Label>
                  <Link href={paraPaciente ? "/olvide-password?paciente=1" : "/olvide-password"} className="text-sm text-dorado hover:underline">
                    ¿La olvidaste?
                  </Link>
                </div>
                <InputPassword
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={cargando}
                  className="mt-1"
                />
              </div>

              {error && <p role="alert" className="text-sm text-peligro">{error}</p>}
              {aviso && <p role="status" className="text-sm text-dorado">{aviso}</p>}

              <Button type="submit" className="mt-2 h-12 w-full text-base" disabled={cargando}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
            </form>
            {paraPaciente ? (
              <p className="mt-6 text-sm text-crema/60">
                ¿Todavía no tenés contraseña? Tu consultorio te manda el enlace para crearla a tu email.
              </p>
            ) : (
              <p className="mt-6 text-sm text-crema/60">
                ¿Sos paciente?{" "}
                <Link href="/pacientes" className="text-dorado hover:underline">Entrá por el acceso de pacientes</Link>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-4 mb-6">
              <ShieldCheck className="h-10 w-10 text-dorado" aria-hidden="true" />
              <h1 className="mt-2 titulo text-3xl text-crema">Verificación en dos pasos</h1>
              <p className="mt-2 text-sm text-foreground/80">
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

              {error && <p role="alert" className="text-sm text-peligro">{error}</p>}

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
    </PantallaAcceso>
  );
}