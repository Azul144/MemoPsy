import { Sparkles } from "lucide-react";

export default function PorQue() {
  return (
    <section id="por-que" className="px-4 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-card">
          <Sparkles className="h-9 w-9 text-primary" />
        </div>

        <h2 className="mt-6 text-4xl font-bold text-primary">¿Por qué MemoPsy?</h2>

        <p className="mt-6 text-lg leading-relaxed text-white/90">
          Porque tu vocación es acompañar a tus pacientes, no perder tiempo en la gestión.
          MemoPsy reúne en un solo lugar las notas clínicas, la agenda y el material de
          seguimiento, para que el proceso terapéutico no se corte entre una sesión y la otra.
        </p>

        <p className="mt-5 text-lg leading-relaxed text-white/90">
          Y porque la confidencialidad no es opcional: las notas se guardan cifradas, cada rol
          ve solo lo que le corresponde y cada acceso queda registrado, en línea con la Ley
          25.326 y con el secreto profesional que exige la Ley 461 de la Provincia de Formosa.
        </p>

        <a
          href="#contacto"
          className="mt-10 inline-block rounded-md border border-primary px-7 py-3 font-semibold text-primary hover:bg-primary/10"
        >
          Contáctenos
        </a>
      </div>
    </section>
  );
}