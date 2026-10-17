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
  return (
    <section id="testimonios" className="px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-white/70">¿Qué dicen nuestros clientes?</p>
        <h2 className="mt-3 text-4xl font-bold text-primary">Testimonios de Clientes</h2>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap justify-center gap-6">
        {testimonios.map((t) => (
          <div
            key={t.nombre}
            className="flex w-full flex-col items-center rounded-2xl border border-white/10 bg-card p-8 text-center md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {iniciales(t.nombre)}
            </div>
            <p className="mt-5 flex-1 text-white/90">“{t.texto}”</p>
            <p className="mt-5 font-semibold text-white">{t.nombre}</p>
            <p className="mt-1 text-sm text-white/70">{t.cargo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}