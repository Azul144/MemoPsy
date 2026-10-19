"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonios = [
  {
    nombre: "Laura Fernández",
    cargo: "Recepcionista, Clínica Bienestar Mental",
    texto:
      "Coordinar las agendas de varios psicólogos era un desafío. Con MemoPsy, todo fluye. La visualización de turnos es clara, los recordatorios automáticos y la comunicación interna es más ágil.",
  },
  {
    nombre: "Dr. Alejandro Ramírez",
    cargo: "Psicólogo Clínico",
    texto:
      "MemoPsy transformó mi consulta. La gestión de informes es ágil, segura y me permite tener todo el historial a un clic antes de cada sesión. He recuperado horas que ahora dedico plenamente a mis pacientes.",
  },
  {
    nombre: "Dra. Valeria Costa",
    cargo: "Psicóloga Especialista en Infanto-Juvenil",
    texto:
      "MemoPsy me ofrece tranquilidad con su cifrado y control de acceso. Además, la estructura para documentar observaciones y evoluciones es excelente para un seguimiento detallado.",
  },
  {
    nombre: "Martín Cisneros",
    cargo: "Paciente",
    texto:
      "Es muy práctico poder consultar mis citas desde mi perfil y recibir los recordatorios. Lo que más valoro son los resúmenes de progreso que mi terapeuta comparte conmigo a través de MemoPsy.",
  },
  {
    nombre: "Andrés Navarro",
    cargo: "Psicólogo",
    texto:
      "Como recién egresado, buscaba una herramienta profesional pero fácil de usar. MemoPsy es súper intuitivo, me mantiene organizado con las citas y los informes, y me da una imagen seria frente a mis pacientes.",
  },
];

// Devuelve las iniciales: "Dr. Alejandro Ramírez" → "AR"
function iniciales(nombre: string) {
  return nombre
    .replace("Dra. ", "")
    .replace("Dr. ", "")
    .split(" ")
    .map((palabra) => palabra[0])
    .join("");
}

export default function Testimonios() {
  const cinta = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Mueve la cinta hasta la tarjeta número "i"
  function irA(i: number) {
    const contenedor = cinta.current;
    if (!contenedor) return;
    const total = testimonios.length;
    const destino = (i + total) % total;
    const tarjeta = contenedor.children[destino] as HTMLElement | undefined;
    if (!tarjeta) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    contenedor.scrollTo({ left: tarjeta.offsetLeft - contenedor.offsetLeft, behavior: reducir ? "auto" : "smooth" });
    setActual(destino);
  }

  // Avanza sola cada 5 segundos (se frena con el mouse encima o al usar el teclado)
  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => irA(actual + 1), 5000);
    return () => clearInterval(id);
  }, [actual, pausado]);

  // Si la persona desliza con el dedo, actualiza los puntitos
  function alDeslizar() {
    const contenedor = cinta.current;
    if (!contenedor) return;
    const ancho = (contenedor.children[0] as HTMLElement)?.offsetWidth ?? 1;
    setActual(Math.round(contenedor.scrollLeft / (ancho + 24)));
  }

  return (
    <section id="testimonios" className="py-24">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6">
        <h2 className="titulo max-w-xl text-4xl text-crema sm:text-5xl">Lo que dicen quienes ya lo usan</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => irA(actual - 1)}
            aria-label="Opinión anterior"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-crema transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => irA(actual + 1)}
            aria-label="Opinión siguiente"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={cinta}
        onScroll={alDeslizar}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onFocus={() => setPausado(true)}
        onBlur={() => setPausado(false)}
        className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonios.map((t, i) => (
          <figure
            key={t.nombre}
            className={`flex w-[85%] shrink-0 snap-start flex-col rounded-3xl border p-8 transition-colors duration-500 sm:w-[26rem] ${
              i === actual ? "border-primary/50 bg-card" : "border-white/10 bg-card/60"
            }`}
          >
            <span aria-hidden className="titulo text-6xl leading-none text-primary/80">“</span>
            <blockquote className="mt-2 flex-1 leading-relaxed text-crema/90">{t.texto}</blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                {iniciales(t.nombre)}
              </span>
              <span>
                <span className="block font-semibold text-crema">{t.nombre}</span>
                <span className="block text-sm text-crema/65">{t.cargo}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Puntitos: muestran en qué opinión estás y permiten saltar a otra */}
      <div className="mt-6 flex justify-center gap-2">
        {testimonios.map((t, i) => (
          <button
            key={t.nombre}
            type="button"
            onClick={() => irA(i)}
            aria-label={`Ver opinión de ${t.nombre}`}
            aria-current={i === actual}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === actual ? "w-8 bg-primary" : "w-2.5 bg-white/25 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
