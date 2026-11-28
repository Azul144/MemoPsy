// src/components/PantallaAcceso.tsx
// Diseño compartido por login, "olvidé mi contraseña" y "nueva contraseña":
// a la izquierda una foto con una frase, a la derecha el formulario.
// En el celular se ve solo el formulario.
// Para el paciente (enlace fijo /pacientes, email de bienvenida) no se muestra «Volver al inicio»:
// la portada es para el psicólogo y el paciente entra directo a su cuenta, como al campus de una facultad.
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, ShieldCheck } from "lucide-react";
import FondoAnimado from "@/components/comunes/FondoAnimado";
import LogoMemoPsy from "@/components/comunes/LogoMemoPsy"

export default function PantallaAcceso({ children, paraPaciente = false }: { children: React.ReactNode; paraPaciente?: boolean }) {
  return (
    <main className="tema-oscuro grid min-h-dvh bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      {/* Panel con la foto (solo en pantallas grandes) */}
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          // Paciente: psicóloga y paciente charlando, encuadrada en la paciente; consultorio: la foto del consultorio
          src={paraPaciente ? "/assets/terapia.jpg" : "/assets/consultorio.jpg"}
          alt=""
          fill
          priority
          sizes="55vw"
          className={`foto-lenta object-cover ${paraPaciente ? "object-[56%_50%]" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />

        <div className="absolute inset-x-0 bottom-0 p-14">
          <p className="titulo entrar max-w-lg text-balance text-4xl text-crema xl:text-5xl">
            {paraPaciente ? "Seguí tu proceso, también entre sesiones." : "Tu consultorio, ordenado y protegido."}
          </p>
          <p
            className="entrar mt-5 flex items-center gap-2 text-crema/80"
            style={{ animationDelay: "0.2s" }}
          >
            {paraPaciente ? <CalendarCheck className="h-5 w-5 text-salvia" /> : <ShieldCheck className="h-5 w-5 text-salvia" />}
            {paraPaciente ? "Tus turnos, tus pautas y tus actividades, en tu cuenta." : "Notas cifradas y acceso con verificación en dos pasos."}
          </p>
        </div>
      </aside>

      {/* Formulario */}
      <section className="relative flex flex-col overflow-hidden px-6 py-6 sm:px-12 sm:py-8">
        {/* En el celular las manchas de luz se apagan cerca del borde de arriba y del de abajo:
            así la pantalla termina en el mismo verde con que Safari pinta la barra de la hora y la de la dirección */}
        <FondoAnimado
          intensidad="suave"
          className="max-lg:[mask-image:linear-gradient(to_bottom,transparent,black_9rem,black_calc(100%-9rem),transparent)]"
        />
        {/* Vuelta a la portada (no para el paciente) */}
        {!paraPaciente && (
          <div className="relative flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex w-fit shrink-0 items-center gap-2 text-sm text-crema/70 transition-colors hover:text-dorado"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sm:hidden">Inicio</span>
              <span className="hidden sm:inline">Volver al inicio</span>
            </Link>
          </div>
        )}

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
