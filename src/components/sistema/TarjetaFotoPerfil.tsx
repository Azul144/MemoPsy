// src/components/sistema/TarjetaFotoPerfil.tsx
// RF 1.3 - Tarjeta «Foto de perfil» de Mi cuenta: cambiar la foto (archivo o cámara del celular) o quitarla.
// Antes de subirla, el navegador la recorta cuadrada desde el centro y la achica a 256 px en JPG.
"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avisoError, avisoExito } from "@/lib/avisos";
import FotoPerfil, { avisarCambioFoto, useVersionFoto } from "./FotoPerfil";

const LADO = 256;

async function recortarFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("formato"));
      el.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO, LADO);
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, LADO, LADO);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("formato"))), "image/jpeg", 0.88),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function TarjetaFotoPerfil() {
  const { data: session } = useSession();
  const version = useVersionFoto();
  const archivo = useRef<HTMLInputElement>(null);
  const camara = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState<"subiendo" | "quitando" | null>(null);

  const usuario = session?.user;
  const perfiles: string[] = (usuario?.perfiles ?? []).map((p: { nombre?: string }) => p?.nombre ?? "").filter(Boolean);
  const datosFoto = {
    nombre: usuario?.persona?.nombre,
    apellido: usuario?.persona?.apellido,
    email: usuario?.email ?? undefined,
    perfiles,
  };
  const nombreCompleto = [usuario?.persona?.nombre, usuario?.persona?.apellido].filter(Boolean).join(" ") || usuario?.email;

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0];
    e.target.value = "";
    if (!elegido) return;
    if (!elegido.type.startsWith("image/")) {
      avisoError("Elegí una imagen JPG o PNG.");
      return;
    }
    setOcupado("subiendo");
    try {
      let foto: Blob;
      try {
        foto = await recortarFoto(elegido);
      } catch {
        avisoError("No se pudo leer la imagen. Probá con una foto JPG o PNG.");
        return;
      }
      const datos = new FormData();
      datos.append("archivo", foto, "foto-perfil.jpg");
      const r = await fetch("/api/usuarios/me/foto", { method: "PUT", body: datos });
      const respuesta = await r.json().catch(() => ({}));
      if (!r.ok) {
        avisoError(respuesta.error ?? "No se pudo guardar la foto.");
        return;
      }
      avisarCambioFoto(respuesta.fotoActualizada);
      avisoExito("Foto de perfil actualizada");
    } catch {
      avisoError("No se pudo guardar la foto. Revisá tu conexión.");
    } finally {
      setOcupado(null);
    }
  }

  async function quitar() {
    setOcupado("quitando");
    try {
      const r = await fetch("/api/usuarios/me/foto", { method: "DELETE" });
      if (!r.ok) {
        avisoError("No se pudo quitar la foto.");
        return;
      }
      avisarCambioFoto(null);
      avisoExito("Foto quitada: se muestran tus iniciales");
    } catch {
      avisoError("No se pudo quitar la foto. Revisá tu conexión.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section className="rounded-2xl border border-borde bg-card p-5 lg:col-span-2" aria-labelledby="titulo-foto">
      <h2 id="titulo-foto" className="mb-4 text-lg font-semibold text-dorado">Foto de perfil</h2>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => archivo.current?.click()}
          disabled={!!ocupado}
          aria-label="Cambiar la foto de perfil"
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FotoPerfil {...datosFoto} tamano={112} className="border-[3px] border-primary" />
          <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
            {ocupado === "subiendo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
          </span>
        </button>

        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold text-crema">{nombreCompleto}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {perfiles.map((p) => (
              <span key={p} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-dorado">{p}</span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button type="button" onClick={() => archivo.current?.click()} disabled={!!ocupado} className="rounded-full bg-primary text-primary-foreground hover:bg-opacity-80">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {version ? "Cambiar foto" : "Subir foto"}
            </Button>
            <Button type="button" variant="outline" onClick={() => camara.current?.click()} disabled={!!ocupado} className="rounded-full border-borde-fuerte bg-transparent text-crema hover:bg-superficie sm:hidden">
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              Sacar foto
            </Button>
            {version && (
              <Button type="button" variant="outline" onClick={quitar} disabled={!!ocupado} className="rounded-full border-peligro/40 bg-transparent text-peligro hover:bg-peligro/10">
                {ocupado === "quitando" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-tenue">
        JPG o PNG. Se recorta en círculo y se achica antes de subirla. Si no tenés foto, se muestran tus iniciales.
      </p>
      <input ref={archivo} type="file" accept="image/jpeg,image/png" hidden onChange={alElegir} />
      <input ref={camara} type="file" accept="image/*" capture="user" hidden onChange={alElegir} />
    </section>
  );
}
