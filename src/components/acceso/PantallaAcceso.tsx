// src/components/PantallaAcceso.tsx
// Diseño compartido por login, "olvidé mi contraseña" y "nueva contraseña":
// a la izquierda una foto con una frase, a la derecha el formulario.
// En el celular se ve solo el formulario.
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import FondoAnimado from "@/components/comunes/FondoAnimado";
import LogoMemoPsy from "@/components/comunes/LogoMemoPsy"

export default function PantallaAcceso({ children }: { children: React.ReactNode }) {
  return (
    <main className="tema-oscuro grid min-h-dvh bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      {/* Panel con la foto (solo en pantallas grandes) */}
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src="/assets/consultorio.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="foto-lenta object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />

        <div className="absolute inset-x-0 bottom-0 p-14">
          <p className="titulo entrar max-w-lg text-4xl text-crema xl:text-5xl">
            Tu consultorio, ordenado y protegido.
          </p>
          <p
            className="entrar mt-5 flex items-center gap-2 text-crema/80"
            style={{ animationDelay: "0.2s" }}
          >
            <ShieldCheck className="h-5 w-5 text-salvia" />
            Notas cifradas y acceso con verificación en dos pasos.
          </p>
        </div>
      </aside>

      {/* Formulario */}
      <section className="relative flex flex-col overflow-hidden px-6 py-6 sm:px-12 sm:py-8">
        <FondoAnimado intensidad="suave" />
        {/* En el celular, "Volver" y el botón de crisis entran en una sola línea */}
        <div className="relative flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex w-fit shrink-0 items-center gap-2 text-sm text-crema/70 transition-colors hover:text-dorado"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">Inicio</span>
            <span className="hidden sm:inline">Volver al inicio</span>
          </Link>
          {/* Ayuda en crisis: pública, sin iniciar sesión, a cualquier hora */}
          <Link
            href="/crisis"
            className="inline-flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-crema transition-colors hover:bg-red-500/25 sm:px-4"
          >
            <HeartHandshake className="h-4 w-4 shrink-0 text-peligro" aria-hidden="true" />
            ¿Estás en crisis? Ayuda ahora
          </Link>
        </div>

        {/* En el celular el formulario arranca arriba (sin el hueco del centrado); en pantallas grandes va centrado */}
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col pt-14 pb-8 sm:justify-center sm:py-10">
          <div className="entrar mb-8 flex items-center gap-3">
            <LogoMemoPsy tamano="lg" />
          </div>
          <div className="entrar" style={{ animationDelay: "0.1s" }}>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
