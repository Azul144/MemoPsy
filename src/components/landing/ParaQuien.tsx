// src/components/landing/ParaQuien.tsx
// Sitio público: los beneficios para el psicólogo, que es quien contrata MemoPsy. Lo que reciben sus
// pacientes se presenta como un valor agregado de su consultorio. Cada uno lo respalda una función real.
import { Stethoscope, HeartHandshake, LifeBuoy, Mic, BellRing, ShieldCheck, CalendarDays, Repeat } from "lucide-react";

const roles = [
  {
    rol: "Para vos",
    frase: "Más tiempo para la clínica, menos para la administración.",
    icono: Stethoscope,
    beneficios: [
      { icono: Mic, titulo: "Notas en minutos", texto: "Dictás la sesión y la IA ordena la nota. Vos la revisás." },
      { icono: BellRing, titulo: "Menos ausencias", texto: "El paciente recibe el recordatorio por email y WhatsApp." },
      { icono: ShieldCheck, titulo: "Tranquilidad legal", texto: "Notas cifradas y registro de cada acceso." },
    ],
  },
  {
    rol: "Para tus pacientes",
    frase: "Un valor agregado de tu consultorio, sin trabajo extra para vos.",
    icono: HeartHandshake,
    beneficios: [
      { icono: CalendarDays, titulo: "Sus turnos a mano", texto: "Y la videollamada a un toque, si la sesión es remota." },
      { icono: Repeat, titulo: "Reprograman solos", texto: "Eligen otro horario libre sin llamarte." },
      { icono: LifeBuoy, titulo: "Te avisan si están mal", texto: "Desde su cuenta te avisan qué les pasa y te llega al WhatsApp." },
    ],
  },
];

export default function ParaQuien() {
  return (
    <section id="beneficios" className="px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 data-revelar className="titulo max-w-2xl text-4xl text-balance text-crema sm:text-5xl">Lo que gana tu consultorio</h2>

        <div className="mt-14 space-y-12">
          {roles.map((r) => (
            <div key={r.rol} className="grid items-center gap-8 lg:grid-cols-[17rem_1fr]">
              <div data-revelar="izquierda">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <r.icono className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="titulo mt-4 text-3xl text-crema">{r.rol}</h3>
                <p className="mt-2 leading-relaxed text-crema/70">{r.frase}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {r.beneficios.map((b, i) => (
                  <article
                    key={b.titulo}
                    data-revelar
                    style={{ "--retraso": `${150 + i * 120}ms` } as React.CSSProperties}
                    className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-gradient-to-br from-card to-superficie p-6 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <span className="titulo pointer-events-none absolute -top-3 right-3 text-8xl text-foreground/5" aria-hidden="true">
                      {i + 1}
                    </span>
                    <b.icono className="h-7 w-7 text-dorado" aria-hidden="true" />
                    <p className="mt-6 text-xl font-semibold text-crema">{b.titulo}</p>
                    <p className="mt-1 leading-relaxed text-crema/65">{b.texto}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
