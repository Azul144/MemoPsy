// src/components/landing/ComoFunciona.tsx
// Sitio público: «Cómo funciona», el recorrido de una sesión en tres pasos (reemplaza a «Módulos»).
import Image from "next/image";
import FondoAnimado from "@/components/comunes/FondoAnimado";

const pasos = [
  {
    titulo: "Se agenda el turno",
    texto: "La recepción o el psicólogo lo carga en la agenda, dentro de los horarios de atención y sin superposiciones.",
    foto: "/assets/recepcion1.jpg",
    alt: "Una recepcionista atiende a una paciente en el mostrador",
  },
  {
    titulo: "El paciente recibe el recordatorio",
    texto: "Le llega por email y por WhatsApp. Si la sesión es remota, entra a la videollamada de Google Meet con un toque.",
    foto: "/assets/agenda.jpg",
    alt: "Agenda abierta junto a un celular y una lapicera",
  },
  {
    titulo: "El psicólogo dicta la nota y deja el seguimiento",
    texto: "La IA ordena lo dictado y el psicólogo lo revisa. El paciente recibe sus pautas y actividades para la semana.",
    foto: "/assets/terapia2.jpg",
    alt: "Una psicóloga toma notas durante una sesión",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="relative overflow-hidden bg-superficie px-6 py-16 sm:py-24">
      <FondoAnimado intensidad="suave" />
      <div data-revelar className="relative mx-auto max-w-3xl text-center">
        <h2 className="titulo text-4xl text-balance text-crema sm:text-5xl">Cómo funciona</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-balance text-crema/75">
          Así acompaña MemoPsy cada sesión, desde que se pide el turno hasta después del encuentro.
        </p>
      </div>

      <ol className="relative mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
        {pasos.map((paso, i) => (
          <li
            key={paso.titulo}
            data-revelar
            style={{ "--retraso": `${i * 150}ms` } as React.CSSProperties}
            className="group overflow-hidden rounded-[2rem] border border-foreground/10 bg-card">
            <div className="foto-velo relative aspect-[4/3] overflow-hidden">
              <Image
                src={paso.foto}
                alt={paso.alt}
                fill
                sizes="(min-width: 768px) 30vw, 90vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="titulo absolute top-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground shadow-lg">
                {i + 1}
              </span>
            </div>
            <div className="p-7">
              <h3 className="titulo text-2xl text-crema">{paso.titulo}</h3>
              <p className="mt-3 leading-relaxed text-crema/75">{paso.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
