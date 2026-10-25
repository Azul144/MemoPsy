import Image from "next/image";
import Link from "next/link";
import FondoAnimado from "@/components/FondoAnimado";
import { CalendarClock, Lock, Mail, ShieldCheck, KeyRound } from "lucide-react";

// Tarjetitas que "flotan" sobre la foto: muestran lo que hace el sistema
const tarjetas = [
  {
    icono: CalendarClock,
    titulo: "Próxima sesión",
    detalle: "Hoy a las 16:30, presencial",
    posicion: "left-2 top-10 lg:-left-10",
    retraso: "0.7s",
  },
  {
    icono: Lock,
    titulo: "Nota guardada",
    detalle: "Cifrada y visible solo para vos",
    // En el celular no entra junto a la de abajo: se muestra desde tablet
    posicion: "right-2 top-[64%] hidden sm:block lg:-right-4",
    retraso: "1s",
  },
  {
    icono: Mail,
    titulo: "Recordatorio enviado",
    detalle: "Por email, 24 h antes",
    posicion: "bottom-8 left-2 lg:-left-6",
    retraso: "1.3s",
  },
];

export default function Portada() {
  return (
    <section id="inicio" className="relative overflow-hidden px-6 pt-16 pb-24 lg:pt-24">
      {/* Luces que se mueven despacio en el fondo */}
      <FondoAnimado />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        {/* Texto */}
        <div>
          <h1 className="titulo entrar text-5xl text-crema sm:text-6xl lg:text-7xl">
            Menos tiempo en papeles, más tiempo con tus pacientes.
          </h1>

          <p
            className="entrar mt-7 max-w-xl text-lg leading-relaxed text-crema/80"
            style={{ animationDelay: "0.15s" }}
          >
            MemoPsy reúne las notas clínicas, la agenda y el seguimiento de cada paciente en un
            sistema web seguro, pensado para consultorios de psicología de la Provincia de Formosa.
          </p>

          <div className="entrar mt-10 flex flex-wrap gap-4" style={{ animationDelay: "0.3s" }}>
            <a
              href="#contacto"
              className="rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Pedir una demostración
            </a>
            <Link
              href="/login"
              className="rounded-full border border-crema/30 px-7 py-3.5 font-semibold text-crema transition-colors hover:border-primary hover:text-dorado"
            >
              Iniciar sesión
            </Link>
          </div>

          <ul
            className="entrar mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-crema/70"
            style={{ animationDelay: "0.45s" }}
          >
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-salvia" />
              Datos protegidos según la Ley 25.326
            </li>
            <li className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-salvia" />
              Verificación en dos pasos
            </li>
          </ul>
        </div>

        {/* Foto en forma de arco con las tarjetitas encima */}
        <div className="relative mx-auto w-full max-w-md lg:mr-0 lg:max-w-[30rem]">
          <div
            className="foto-velo entrar relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] border border-foreground/10 shadow-2xl shadow-black/40"
            style={{ animationDelay: "0.2s" }}
          >
            <Image
              src="/assets/portada.jpg"
              alt="Una psicóloga toma notas mientras escucha a su paciente en el consultorio"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover object-[55%_60%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
          </div>

          {tarjetas.map((t) => (
            <div
              key={t.titulo}
              className={`absolute ${t.posicion}`}
            >
              <div
                className="tarjeta-flotante flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card/90 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur"
                style={{ animationDelay: `${t.retraso}, calc(${t.retraso} + 0.9s)` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <t.icono className="h-4 w-4 text-dorado" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-crema">{t.titulo}</span>
                  <span className="block text-xs text-crema/70">{t.detalle}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
