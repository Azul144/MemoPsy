// src/app/(main)/cuenta/page.tsx
// RF 1.3 - Mi cuenta: cada usuario edita sus datos y cambia su contraseña.
"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import InputPassword from "@/components/acceso/InputPassword";
import RequisitosPassword from "@/components/acceso/RequisitosPassword";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avisoError, avisoExito } from "@/lib/avisos";
import { AYUDA_CELULAR } from "@/lib/telefono";
import { REQUISITOS_PASSWORD } from "@/lib/validaciones/password";

interface DatosCuenta {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
}

export default function MiCuentaPage() {
  const [datos, setDatos] = useState<DatosCuenta | null>(null);
  const [emailGuardado, setEmailGuardado] = useState("");
  const [passwordParaEmail, setPasswordParaEmail] = useState("");
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios/me")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const cuenta: DatosCuenta = await r.json();
        setDatos(cuenta);
        setEmailGuardado(cuenta.email);
      })
      .catch(() => avisoError("No se pudieron cargar tus datos."));
  }, []);

  const cambiaEmail = !!datos && datos.email.trim().toLowerCase() !== emailGuardado.toLowerCase();
  const nuevaValida = REQUISITOS_PASSWORD.every((r) => r.cumple(nueva));

  async function guardarDatos(e: FormEvent) {
    e.preventDefault();
    if (!datos) return;
    setGuardandoDatos(true);
    try {
      const r = await fetch("/api/usuarios/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datos.nombre,
          apellido: datos.apellido,
          email: datos.email,
          telefono: datos.telefono,
          passwordActual: cambiaEmail ? passwordParaEmail : undefined,
        }),
      });
      const respuesta = await r.json().catch(() => null);
      if (!r.ok) throw new Error(respuesta?.error || "No se pudieron guardar los datos.");
      setEmailGuardado(datos.email.trim().toLowerCase());
      setPasswordParaEmail("");
      avisoExito("Datos guardados. El nombre de la barra se actualiza la próxima vez que inicies sesión.");
    } catch (error) {
      avisoError((error as Error).message);
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function cambiarContrasena(e: FormEvent) {
    e.preventDefault();
    if (nueva !== repetida) {
      avisoError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setCambiando(true);
    try {
      const r = await fetch("/api/usuarios/me/contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const respuesta = await r.json().catch(() => null);
      if (!r.ok) throw new Error(respuesta?.error || "No se pudo cambiar la contraseña.");
      setActual("");
      setNueva("");
      setRepetida("");
      avisoExito("Contraseña cambiada.");
    } catch (error) {
      avisoError((error as Error).message);
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <EncabezadoPagina
          titulo="Mi cuenta"
          descripcion="Tus datos personales y tu contraseña."
          volverA="/welcome"
          textoVolver="Volver al inicio"
        />

        {!datos ? (
          <div className="flex items-center justify-center gap-3 py-16 text-suave">
            <Loader2 className="h-6 w-6 animate-spin text-dorado" />
            Cargando tus datos...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={guardarDatos} className="space-y-4 rounded-2xl border border-borde bg-card p-5">
              <h2 className="text-lg font-semibold text-dorado">Mis datos</h2>
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-texto-2">Nombre</Label>
                <Input id="nombre" value={datos.nombre} maxLength={100} required onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className="border-borde-fuerte bg-background text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellido" className="text-texto-2">Apellido</Label>
                <Input id="apellido" value={datos.apellido} maxLength={100} required onChange={(e) => setDatos({ ...datos, apellido: e.target.value })} className="border-borde-fuerte bg-background text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dni" className="text-texto-2">DNI</Label>
                <Input id="dni" value={datos.dni} disabled className="border-borde-fuerte bg-background text-suave" />
                <p className="text-sm text-tenue">Si hay que corregirlo, lo cambia el administrador.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-texto-2">Celular (opcional)</Label>
                <Input id="telefono" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} className="border-borde-fuerte bg-background text-foreground" />
                <p className="text-sm text-tenue">{AYUDA_CELULAR}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-texto-2">Email</Label>
                <Input id="email" type="email" value={datos.email} maxLength={100} required onChange={(e) => setDatos({ ...datos, email: e.target.value })} className="border-borde-fuerte bg-background text-foreground" />
              </div>
              {cambiaEmail && (
                <div className="space-y-1.5">
                  <Label htmlFor="passwordParaEmail" className="text-texto-2">Contraseña actual</Label>
                  <InputPassword id="passwordParaEmail" value={passwordParaEmail} required autoComplete="current-password" onChange={(e) => setPasswordParaEmail(e.target.value)} />
                  <p className="text-sm text-tenue">Con el email se inicia sesión: para cambiarlo hace falta tu contraseña.</p>
                </div>
              )}
              <Button type="submit" disabled={guardandoDatos} className="bg-primary text-primary-foreground hover:bg-opacity-80">
                {guardandoDatos && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar mis datos
              </Button>
            </form>

            <form onSubmit={cambiarContrasena} className="h-fit space-y-4 rounded-2xl border border-borde bg-card p-5">
              <h2 className="text-lg font-semibold text-dorado">Cambiar contraseña</h2>
              <div className="space-y-1.5">
                <Label htmlFor="actual" className="text-texto-2">Contraseña actual</Label>
                <InputPassword id="actual" value={actual} required autoComplete="current-password" onChange={(e) => setActual(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nueva" className="text-texto-2">Contraseña nueva</Label>
                <InputPassword id="nueva" value={nueva} required autoComplete="new-password" onChange={(e) => setNueva(e.target.value)} />
                <RequisitosPassword password={nueva} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="repetida" className="text-texto-2">Repetir la contraseña nueva</Label>
                <InputPassword id="repetida" value={repetida} required autoComplete="new-password" onChange={(e) => setRepetida(e.target.value)} />
              </div>
              <Button type="submit" disabled={cambiando || !nuevaValida} className="bg-primary text-primary-foreground hover:bg-opacity-80">
                {cambiando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cambiar contraseña
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
