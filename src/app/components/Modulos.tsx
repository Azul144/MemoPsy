import Image from "next/image";
import FondoAnimado from "@/components/FondoAnimado";
import { Users, Mic, Video, ShieldCheck } from "lucide-react";

const modulos = [
  {
    icono: Users,
    titulo: "Usuarios",
    texto:
      "Registro e inicio de sesión con verificación en dos pasos. Roles de psicólogo, recepcionista, auditor y paciente, con registro de auditoría de cada acceso.",
    foto: "/assets/recepcion1.jpg",
    alt: "Una recepcionista atiende a una paciente en el mostrador",
  },
  {
    icono: Mic,
    titulo: "Informes",
    texto:
      "Notas clínicas con búsqueda por paciente, fecha o etiqueta. Dictado por voz: la IA propone una estructura y vos la revisás antes de guardarla.",
    foto: "/assets/terapia2.jpg",
    alt: "Una psicóloga toma notas durante una sesión",
  },
  {
    icono: Video,
    titulo: "Gestión de sesiones",
    texto:
      "Agenda que controla la disponibilidad del profesional, recordatorios automáticos por WhatsApp y enlace de Google Meet para las sesiones remotas.",
    foto: "/assets/agenda.jpg",
    alt: "Agenda abierta junto a un celular y una lapicera",
  },
  {
    icono: ShieldCheck,
    titulo: "Perfiles y permisos",
    texto:
      "Definí qué puede ver y hacer cada rol. La recepción gestiona turnos y pagos sin acceder a la información clínica.",
    foto: "/assets/terapia4.jpg",
    alt: "Sesión de terapia en un consultorio luminoso",
  },
];

export default function Modulos() {
  return (
    <section id="modulos" className="relative overflow-hidden bg-[#1E3A39] px-6 py-24">
      <FondoAnimado intensidad="suave" />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="titulo text-4xl text-crema sm:text-5xl">Cuatro módulos, un solo sistema</h2>
        <p className="mt-4 text-lg text-crema/75">
          Cada módulo resuelve una parte de la gestión del consultorio y comparte la misma base segura.
        </p>
      </div>

      <div className="relative mx-auto mt-20 flex max-w-6xl flex-col gap-20 lg:gap-28">
        {modulos.map((modulo, i) => (
          <article key={modulo.titulo} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            {/* En los módulos pares la foto va a la derecha */}
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 ${
                i % 2 === 1 ? "md:order-2" : ""
              }`}
            >
              <Image
                src={modulo.foto}
                alt={modulo.alt}
                fill
                sizes="(min-width: 768px) 45vw, 90vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>

            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <modulo.icono className="h-7 w-7 text-primary" />
              </span>
              <h3 className="titulo mt-6 text-3xl text-crema sm:text-4xl">{modulo.titulo}</h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-crema/75">{modulo.texto}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
