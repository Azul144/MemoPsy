"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

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
    <section id="contacto" className="px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-white/70">Seamos socios</p>
        <h2 className="mt-3 text-4xl font-bold text-primary">Solicitud de reunión</h2>
        <p className="mt-3 text-white/80">
          Contanos cuándo te viene bien y coordinamos una reunión para mostrarte MemoPsy en acción.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-10 md:grid-cols-2">
        {/* Foto */}
        <div className="relative min-h-72 overflow-hidden rounded-3xl border border-white/10">
          <Image
            src="/assets/reunion1.jpg"
            alt="Reunión de trabajo entre profesionales"
            fill
            className="object-cover"
          />
        </div>

        {/* Formulario */}
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {/* Datos ocultos que pide Web3Forms */}
          <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_KEY} />
          <input type="hidden" name="subject" value="MemoPsy - Solicitud de reunión" />

          <input name="Nombre" placeholder="Nombre" required className="campo" />
          <input name="Email" type="email" placeholder="Email" required className="campo" />
          <input name="Telefono" type="tel" placeholder="Número de teléfono" required className="campo" />
          <input name="Motivo" placeholder="Motivo de consulta" required className="campo" />

          <label htmlFor="fecha" className="text-sm text-white/80">Fecha y hora preferida</label>
          <input id="fecha" name="Fecha" type="datetime-local" required className="campo" />

          <button
            type="submit"
            disabled={estado === "enviando"}
            className="h-14 rounded-lg bg-primary font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {estado === "enviando" ? "Enviando..." : "Agendar una reunión"}
          </button>

          {estado === "ok" && (
            <p className="text-center text-primary">¡Enviado! Pronto nos pondremos en contacto.</p>
          )}
          {estado === "error" && (
            <p className="text-center text-red-300">No se pudo enviar. Probá de nuevo en unos minutos.</p>
          )}
        </form>
      </div>
    </section>
  );
}