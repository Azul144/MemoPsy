import Image from "next/image";
import FondoAnimado from "@/components/FondoAnimado";

export default function PorQue() {
  return (
    <section id="por-que" className="relative overflow-hidden bg-superficie px-6 py-24">
      <FondoAnimado intensidad="suave" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] border border-foreground/10 bg-background/70 lg:grid-cols-[1fr_1.2fr]">
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
            La historia clínica y las notas de cada sesión son el corazón del trabajo terapéutico: ahí
            queda registrado cómo evoluciona cada paciente. Sin embargo, en muchos consultorios de la
            Provincia de Formosa todavía se llevan en papel, en planillas o en aplicaciones que no fueron
            pensadas para información de salud.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-crema/85">
            MemoPsy ordena ese registro en un solo lugar: notas clínicas estructuradas y fáciles de
            encontrar antes de cada sesión, la agenda de turnos y el material que el psicólogo decide
            compartir con su paciente, para que el seguimiento no se corte entre una sesión y la otra.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-crema/85">
            Y lo hace cuidando lo más sensible: las notas se guardan cifradas y cada rol ve solo lo que
            le corresponde, con las garantías que pide la Ley 26.529 para la historia clínica digital y
            la Ley 25.326 de Protección de Datos Personales, y respetando el ejercicio profesional que
            regula la Ley 461 de la Provincia de Formosa.
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
