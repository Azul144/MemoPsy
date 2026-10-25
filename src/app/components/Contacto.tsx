"use client";

import { useState, type FormEvent } from "react";

const pasos = [
  { titulo: "Completás el formulario", texto: "Con tus datos y el día y horario que te quedan cómodos." },
  { titulo: "Te escribimos", texto: "Confirmamos la fecha por email o por teléfono." },
  { titulo: "Te mostramos MemoPsy", texto: "Una reunión por Google Meet para recorrer el sistema con vos." },
];

export default function Contacto() {
  const [estado, setEstado] = useState("inicial");

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    setEstado("enviando");

    try {
      const datos = Object.fromEntries(new FormData(formulario));
      const respuesta = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(datos),
      });
      const resultado = await respuesta.json();

      if (resultado.success) {
        formulario.reset();
        setEstado("ok");
      } else {
        setEstado("error");
      }
    } catch {
      setEstado("error");
    }
  }

  return (
    <section id="contacto" className="px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-[1fr_1.15fr]">
        {/* Título y qué pasa después de enviar el formulario */}
        <div>
          <h2 className="titulo text-4xl text-crema sm:text-5xl">Pedí una demostración</h2>
          <p className="mt-4 text-lg text-crema/75">
            Contanos cuándo te viene bien y coordinamos una reunión para mostrarte MemoPsy en acción.
          </p>

          <ol className="mt-10 space-y-9">
            {pasos.map((paso, i) => (
              <li key={paso.titulo} className="relative flex gap-4">
                {/* Línea que une este número con el siguiente */}
                {i < pasos.length - 1 && (
                  <span aria-hidden className="absolute top-10 -bottom-9 left-5 w-0.5 -translate-x-1/2 bg-primary/60" />
                )}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-crema">{paso.titulo}</p>
                  <p className="mt-1 text-crema/70">{paso.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Formulario */}
        <form
          onSubmit={enviar}
          className="flex flex-col gap-4 rounded-[2rem] border border-foreground/10 bg-card p-7 sm:p-8"
        >
          {/* Datos ocultos que pide Web3Forms */}
          <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_KEY} />
          <input type="hidden" name="subject" value="MemoPsy - Solicitud de reunión" />

          <input name="Nombre" placeholder="Nombre" required className="campo" />
          <input name="Email" type="email" placeholder="Email" required className="campo" />
          <input name="Telefono" type="tel" placeholder="Número de teléfono" required className="campo" />
          <input name="Motivo" placeholder="Motivo de consulta" required className="campo" />

          <label htmlFor="fecha" className="text-sm text-foreground/80">Fecha y hora preferida</label>
          <input id="fecha" name="Fecha" type="datetime-local" required className="campo" />

          <button
            type="submit"
            disabled={estado === "enviando"}
            className="h-14 rounded-full bg-primary font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {estado === "enviando" ? "Enviando..." : "Enviar solicitud"}
          </button>

          {estado === "ok" && (
            <p className="text-center text-dorado">¡Enviado! Pronto nos pondremos en contacto.</p>
          )}
          {estado === "error" && (
            <p className="text-center text-peligro">No se pudo enviar. Probá de nuevo en unos minutos.</p>
          )}
        </form>
      </div>
    </section>
  );
}