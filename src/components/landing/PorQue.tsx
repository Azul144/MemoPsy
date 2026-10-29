// src/components/landing/PorQue.tsx
// Sitio público: sección «¿Por qué MemoPsy?», con el problema que resuelve el sistema.
import Image from "next/image";
import FondoAnimado from "@/components/comunes/FondoAnimado";

export default function PorQue() {
  return (
    <section id="por-que" className="relative overflow-hidden bg-superficie px-6 py-24">
      <FondoAnimado intensidad="suave" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] border border-foreground/10 bg-background/70 lg:grid-cols-[1fr_1.2fr]">
        <div className="foto-velo relative min-h-80 lg:h-full">
          <Image
            src="/assets/terapia33.jpg"
            alt="Psicóloga tomando notas durante una sesión con su paciente"
            fill
            quality={85}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover object-[3%_center]"
          />
        </div>

        <div className="px-8 pb-12 lg:py-16 lg:pr-16 lg:pl-0">
          <h2 className="titulo text-4xl text-crema sm:text-5xl">¿Por qué MemoPsy?</h2>

          <p className="mt-6 text-lg leading-relaxed text-crema/85">
            En muchos consultorios de la Provincia de Formosa las sesiones todavía se anotan en papel o en planillas
            sueltas. Así se pierden detalles entre una sesión y otra, y la información sensible queda
            sin protección.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-crema/85">
            MemoPsy reúne en un solo lugar la historia clínica, las notas de cada sesión, la agenda con
            recordatorios y el material para el paciente, para que el seguimiento no se corte.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-crema/85">
            Las notas se guardan cifradas, cada rol ve solo lo que le corresponde y cada acceso queda
            registrado, como piden las leyes 25.326 y 26.529.
          </p>

          <a
            href="#contacto"
            className="mt-10 inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Pedir una demostración
          </a>
        </div>
      </div>
    </section>
  );
}
