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
    <section id="funciones" className="border-y border-white/10 bg-card/60 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="titulo max-w-2xl text-4xl text-crema sm:text-5xl">
          Todo lo que tu consultorio necesita, en una sola plataforma.
        </h2>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {funciones.map((funcion) => (
            <div key={funcion.titulo} className="border-t-2 border-primary/70 pt-6">
              <funcion.icono className="h-7 w-7 text-primary" />
              <h3 className="mt-5 text-xl font-semibold text-crema">{funcion.titulo}</h3>
              <p className="mt-2 leading-relaxed text-crema/75">{funcion.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
