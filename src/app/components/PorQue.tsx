import Image from "next/image";
import FondoAnimado from "@/components/FondoAnimado";

export default function PorQue() {
  return (
    <section id="por-que" className="relative overflow-hidden bg-[#1E3A39] px-6 py-24">
      <FondoAnimado intensidad="suave" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] border border-white/10 bg-background/70 lg:grid-cols-[1fr_1.2fr]">
        <div className="relative min-h-80 lg:h-full">
          <Image
            src="/assets/consultorio2.jpg"
            alt="Paciente sonriendo durante una sesión"
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="px-8 pb-12 lg:py-16 lg:pr-16 lg:pl-0">
          <h2 className="titulo text-4xl text-crema sm:text-5xl">¿Por qué MemoPsy?</h2>

          <p className="mt-6 text-lg leading-relaxed text-crema/85">
            Porque tu vocación es acompañar a tus pacientes, no perder tiempo en la gestión.
            MemoPsy reúne en un solo lugar las notas clínicas, la agenda y el material de
            seguimiento, para que el proceso terapéutico no se corte entre una sesión y la otra.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-crema/85">
            Y porque la confidencialidad no es opcional: las notas se guardan cifradas, cada rol
            ve solo lo que le corresponde y cada acceso queda registrado, en línea con la Ley
            25.326 y con el secreto profesional que exige la Ley 461 de la Provincia de Formosa.
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
