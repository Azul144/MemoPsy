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

function Tarjeta({ t, oculta = false }: { t: (typeof testimonios)[number]; oculta?: boolean }) {
  return (
    <figure
      aria-hidden={oculta || undefined}
      className="flex w-[22rem] shrink-0 flex-col rounded-3xl border border-white/10 bg-card p-8 sm:w-[26rem]"
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
  );
}

export default function Testimonios() {
  return (
    <section id="testimonios" className="overflow-hidden py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="titulo text-4xl text-crema sm:text-5xl">Lo que dicen quienes ya lo usan</h2>
      </div>

      {/* La lista va dos veces seguidas para que la cinta se deslice sin cortes.
          Los bordes se desvanecen con una máscara. */}
      <div className="mt-14 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="cinta flex w-max gap-6 px-3">
          {testimonios.map((t) => (
            <Tarjeta key={t.nombre} t={t} />
          ))}
          {testimonios.map((t) => (
            <Tarjeta key={`${t.nombre}-copia`} t={t} oculta />
          ))}
        </div>
      </div>
    </section>
  );
}
