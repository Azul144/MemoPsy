// Opiniones en mosaico: una destacada en oscuro y las demás en tarjetas claras, todas a la vista
const destacada = {
  nombre: "Dr. Alejandro Ramírez",
  cargo: "Psicólogo clínico",
  rol: "Psicología",
  texto:
    "MemoPsy transformó mi consulta. La gestión de informes es ágil, segura y me permite tener todo el historial a un clic antes de cada sesión. Recuperé horas que ahora dedico plenamente a mis pacientes.",
};

const testimonios = [
  {
    nombre: "Laura Fernández",
    cargo: "Recepcionista, Clínica Bienestar Mental",
    rol: "Recepción",
    texto:
      "Coordinar las agendas de varios psicólogos era un desafío. Con MemoPsy veo los turnos claros y los recordatorios salen solos.",
  },
  {
    nombre: "Dra. Valeria Costa",
    cargo: "Psicóloga infanto-juvenil",
    rol: "Psicología",
    texto:
      "Me da tranquilidad el cifrado y el control de acceso. Y la estructura para registrar evoluciones es ideal para un seguimiento detallado.",
  },
  {
    nombre: "Martín Cisneros",
    cargo: "Paciente",
    rol: "Paciente",
    texto:
      "Consulto mis turnos desde mi perfil y recibo los recordatorios. Lo que más valoro es el material que mi terapeuta comparte conmigo.",
  },
  {
    nombre: "Andrés Navarro",
    cargo: "Psicólogo",
    rol: "Psicología",
    texto:
      "Como recién egresado buscaba algo profesional pero simple. MemoPsy es intuitivo y me mantiene organizado con las citas y los informes.",
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
  return (
    <section id="testimonios" className="seccion-crema bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="titulo max-w-xl text-4xl text-balance text-crema sm:text-5xl">Lo que dicen quienes ya lo usan</h2>
        <p className="mt-4 max-w-xl text-lg text-crema/70">
          Psicólogos, pacientes y recepción cuentan cómo es su día con MemoPsy.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Opinión destacada: usa los colores oscuros de la marca dentro de la sección crema */}
          <figure className="tema-oscuro flex flex-col rounded-[2rem] bg-card p-9 md:col-span-2 lg:col-span-1 lg:row-span-2">
            <span aria-hidden className="titulo text-7xl leading-none text-dorado">“</span>
            <blockquote className="mt-4 flex-1 text-xl leading-relaxed text-crema sm:text-2xl">
              {destacada.texto}
            </blockquote>
            <figcaption className="mt-10 flex items-center gap-4 border-t border-foreground/10 pt-6">
              <Avatar nombre={destacada.nombre} />
              <span>
                <span className="block font-semibold text-crema">{destacada.nombre}</span>
                <span className="block text-sm text-crema/65">{destacada.cargo}</span>
              </span>
            </figcaption>
          </figure>

          {testimonios.map((t) => (
            <figure
              key={t.nombre}
              className="flex flex-col rounded-[2rem] border border-foreground/10 bg-card p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-dorado">
                {t.rol}
              </span>
              <blockquote className="mt-5 flex-1 leading-relaxed text-crema/85">“{t.texto}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar nombre={t.nombre} chico />
                <span>
                  <span className="block text-sm font-semibold text-crema">{t.nombre}</span>
                  <span className="block text-xs text-crema/60">{t.cargo}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Avatar({ nombre, chico = false }: { nombre: string; chico?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground ${
        chico ? "h-10 w-10 text-sm" : "h-12 w-12"
      }`}
    >
      {iniciales(nombre)}
    </span>
  );
}
