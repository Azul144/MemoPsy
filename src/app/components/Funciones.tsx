import { Lock, FileText, CalendarDays, Bell } from "lucide-react";

const funciones = [
  {
    icono: Lock,
    titulo: "Notas cifradas",
    texto: "Cumple con la Ley 25.326 de protección de datos personales.",
  },
  {
    icono: FileText,
    titulo: "Informes",
    texto: "Accedé al historial del paciente en un clic, antes de cada sesión.",
  },
  {
    icono: CalendarDays,
    titulo: "Agenda terapéutica",
    texto: "Automatizá la gestión de turnos, sin superposiciones de horario.",
  },
  {
    icono: Bell,
    titulo: "Recordatorios",
    texto: "Tus pacientes reciben recordatorios de sus sesiones por WhatsApp.",
  },
];

export default function Funciones() {
  return (
    <section id="funciones" className="px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-white/70">Funciones clave</p>
        <h2 className="mt-3 text-4xl font-bold text-primary">Todo lo que necesitás</h2>
        <p className="mt-3 text-white/80">
          En una plataforma especializada para consultorio psicológico.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {funciones.map((funcion) => (
          <div
            key={funcion.titulo}
            className="rounded-2xl border border-white/10 bg-card p-8 text-center"
          >
            <funcion.icono className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold text-white">{funcion.titulo}</h3>
            <p className="mt-3 text-white/80">{funcion.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}