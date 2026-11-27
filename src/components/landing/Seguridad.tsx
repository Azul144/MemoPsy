// src/components/landing/Seguridad.tsx
// Sitio público: «Seguridad y privacidad» (reemplaza a «¿Por qué MemoPsy?»). Responde la duda
// que más frena a un psicólogo: quién puede ver la información clínica.
import Image from "next/image";
import { Lock, UserCheck, KeyRound, ScrollText } from "lucide-react";

const puntos = [
  { icono: Lock, titulo: "Notas cifradas", texto: "Las notas, la historia clínica y las imágenes se guardan cifradas." },
  { icono: UserCheck, titulo: "Cada rol ve lo suyo", texto: "Solo el psicólogo lee lo clínico. La recepción ve turnos y pagos." },
  { icono: KeyRound, titulo: "Acceso protegido", texto: "Verificación en dos pasos y bloqueo ante intentos repetidos." },
  { icono: ScrollText, titulo: "Todo queda registrado", texto: "Cada acceso y cada cambio, sin guardar contenido clínico." },
];

export default function Seguridad() {
  return (
    <section id="seguridad" className="seccion-crema bg-background px-6 py-16 sm:py-24">
      <div data-revelar className="mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] border border-border bg-card lg:grid-cols-[1fr_1.25fr]">
        <div className="relative min-h-72 lg:h-full">
          <Image
            src="/assets/terapia33.jpg"
            alt="Psicóloga tomando notas durante una sesión con su paciente"
            fill
            quality={85}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover object-[3%_center]"
          />
        </div>

        <div className="px-8 pb-12 lg:py-14 lg:pr-14 lg:pl-0">
          <h2 className="titulo text-4xl text-balance text-crema sm:text-5xl">Seguridad y privacidad</h2>
          <p className="mt-4 text-lg leading-relaxed text-crema/80">
            Lo que se habla en sesión queda entre el psicólogo y su paciente, como piden las leyes 25.326 de
            protección de datos y 26.529 de derechos del paciente.
          </p>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {puntos.map((p, i) => (
              <li
                key={p.titulo}
                data-revelar
                style={{ "--retraso": `${300 + i * 100}ms` } as React.CSSProperties}
                className="flex gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <p.icono className="h-5 w-5 text-dorado" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-crema">{p.titulo}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-crema/70">{p.texto}</span>
                </span>
              </li>
            ))}
          </ul>

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
