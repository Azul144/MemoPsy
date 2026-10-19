// src/components/PantallaAcceso.tsx
// Diseño compartido por login, "olvidé mi contraseña" y "nueva contraseña":
// a la izquierda una foto con una frase, a la derecha el formulario.
// En el celular se ve solo el formulario.
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import FondoAnimado from "@/components/FondoAnimado";

export default function PantallaAcceso({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
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
      <section className="relative flex flex-col overflow-hidden px-6 py-8 sm:px-12">
        <FondoAnimado intensidad="suave" />
        <Link
          href="/"
          className="relative inline-flex w-fit items-center gap-2 text-sm text-crema/70 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="entrar mb-8 flex items-center gap-3">
            <Image src="/assets/logopng.png" alt="" width={40} height={48} />
            <span className="titulo text-3xl font-semibold text-primary">MemoPsy</span>
          </div>
          <div className="entrar" style={{ animationDelay: "0.1s" }}>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
