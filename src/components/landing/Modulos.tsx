// src/components/landing/Modulos.tsx
// Sitio público: presentación de los cuatro módulos.
import Image from "next/image";
import FondoAnimado from "@/components/comunes/FondoAnimado";
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
      "Agenda que controla la disponibilidad del profesional, recordatorios automáticos por email y enlace de Google Meet para las sesiones remotas.",
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
    <section id="modulos" className="relative overflow-hidden bg-superficie px-6 py-24">
      <FondoAnimado intensidad="suave" />
      {/* Encabezado centrado, acompaña la grilla simétrica de 2x2 */}
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="titulo text-4xl text-balance text-crema sm:text-5xl">Cuatro módulos, un solo sistema</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-balance text-crema/75">
          Cada módulo resuelve una parte de la gestión del consultorio y comparte la misma base segura.
        </p>
      </div>

      {/* Grilla de 2x2: foto arriba y texto abajo en cada tarjeta */}
      <div className="relative mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2">
        {modulos.map((modulo) => (
          <article
            key={modulo.titulo}
            className="group overflow-hidden rounded-[2rem] border border-foreground/10 bg-card"
          >
            <div className="foto-velo relative aspect-[16/9] overflow-hidden">
              <Image
                src={modulo.foto}
                alt={modulo.alt}
                fill
                sizes="(min-width: 768px) 45vw, 90vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            <div className="p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <modulo.icono className="h-5 w-5 text-dorado" />
                </span>
                <h3 className="titulo text-2xl text-crema">{modulo.titulo}</h3>
              </div>
              <p className="mt-4 leading-relaxed text-crema/75">{modulo.texto}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
