// src/components/landing/ParaQuien.tsx
// Sitio público: qué gana el psicólogo y qué gana el paciente al usar MemoPsy.
// Cada punto es un beneficio respaldado por una función que el sistema ya tiene.
import { Stethoscope, HeartHandshake, Check } from "lucide-react";

const publicos = [
  {
    id: "psicologo",
    icono: Stethoscope,
    etiqueta: "Para el psicólogo",
    titulo: "Más tiempo para la clínica, menos para la administración",
    beneficios: [
      {
        titulo: "Notas en minutos",
        texto: "Dictás lo que pasó en la sesión y la IA te propone la nota ordenada. Vos la revisás antes de guardarla.",
      },
      {
        titulo: "Todo el historial antes de cada sesión",
        texto: "Historia clínica, notas y seguimientos del paciente en un solo lugar, con búsqueda por fecha o etiqueta.",
      },
      {
        titulo: "Menos ausencias",
        texto: "El paciente recibe el recordatorio por email y WhatsApp 24 horas antes, y podés reenviarlo con un clic.",
      },
      {
        titulo: "Una agenda que se ordena sola",
        texto: "Turnos dentro de tus horarios de atención y sin superposiciones. La recepción los gestiona sin ver lo clínico.",
      },
      {
        titulo: "El tratamiento sigue entre sesiones",
        texto: "Le dejás pautas y actividades al paciente y ves cuáles pudo hacer antes del próximo encuentro.",
      },
      {
        titulo: "Tranquilidad legal",
        texto: "Notas cifradas, verificación en dos pasos, registro de cada acceso e historia clínica en PDF foliado.",
      },
    ],
  },
  {
    id: "paciente",
    icono: HeartHandshake,
    etiqueta: "Para el paciente",
    titulo: "Acompañado también entre una sesión y otra",
    beneficios: [
      {
        titulo: "Sus turnos siempre a mano",
        texto: "Ve sus próximas sesiones y, si son remotas, entra a la videollamada desde el mismo turno.",
      },
      {
        titulo: "No se olvida de la sesión",
        texto: "Recibe el recordatorio por email y por WhatsApp, con el día, la hora y, si es remota, el enlace.",
      },
      {
        titulo: "Reprograma sin llamar",
        texto: "Con 24 horas de anticipación, elige otro horario libre de su psicólogo y el cambio se avisa solo.",
      },
      {
        titulo: "Lo trabajado, por escrito",
        texto: "Lee el resumen de la sesión, las pautas y las actividades, y puede descargarlos en PDF.",
      },
      {
        titulo: "Ayuda cuando más la necesita",
        texto: "Una guía para momentos de crisis, con líneas de ayuda. Al usarla, su psicólogo recibe un aviso.",
      },
      {
        titulo: "Su privacidad, protegida",
        texto: "Solo su psicólogo lee las notas clínicas. La recepción ve turnos y pagos, nunca lo que se habla en sesión.",
      },
    ],
  },
];

export default function ParaQuien() {
  return (
    <section id="beneficios" className="px-6 pb-16 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="titulo text-4xl text-balance text-crema sm:text-5xl">Lo que MemoPsy hace por cada uno</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-balance text-crema/75">
            El psicólogo trabaja más ordenado y el paciente se siente acompañado durante todo el tratamiento.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {publicos.map((p) => (
            <article
              key={p.id}
              className="rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-card to-superficie p-8 sm:p-10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                  <p.icono className="h-6 w-6 text-dorado" />
                </span>
                <span className="text-sm font-semibold tracking-wider text-dorado uppercase">{p.etiqueta}</span>
              </div>
              <h3 className="titulo mt-6 text-2xl text-crema sm:text-3xl">{p.titulo}</h3>

              <ul className="mt-8 space-y-5">
                {p.beneficios.map((b) => (
                  <li key={b.titulo} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3.5 w-3.5 text-dorado" />
                    </span>
                    <div>
                      <p className="font-semibold text-crema">{b.titulo}</p>
                      <p className="mt-1 leading-relaxed text-crema/70">{b.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
