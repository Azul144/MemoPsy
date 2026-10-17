import { Users, Mic, Video, ShieldCheck } from "lucide-react";

const modulos = [
  {
    icono: Users,
    titulo: "Usuarios",
    texto:
      "Registro e inicio de sesión con verificación en dos pasos. Roles de psicólogo, recepcionista, auditor y paciente, con registro de auditoría de cada acceso.",
  },
  {
    icono: Mic,
    titulo: "Informes",
    texto:
      "Notas clínicas con búsqueda por paciente, fecha o etiqueta. Dictado por voz: la IA propone una estructura y vos la revisás antes de guardarla.",
  },
  {
    icono: Video,
    titulo: "Gestión de Sesiones",
    texto:
      "Agenda que controla la disponibilidad del profesional, recordatorios automáticos por WhatsApp y enlace de Google Meet para las sesiones remotas.",
  },
  {
    icono: ShieldCheck,
    titulo: "Perfiles y Permisos",
    texto:
      "Definí qué puede ver y hacer cada rol. La recepción gestiona turnos y pagos sin acceder a la información clínica.",
  },
];

export default function Modulos() {
  return (
    <section id="modulos" className="px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-white/70">Cómo funciona</p>
        <h2 className="mt-3 text-4xl font-bold text-primary">Cuatro módulos, un solo sistema</h2>
        <p className="mt-3 text-white/80">
          Cada módulo resuelve una parte de la gestión del consultorio y comparte la misma base segura.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
        {modulos.map((modulo) => (
          <div
            key={modulo.titulo}
            className="flex gap-5 rounded-2xl border border-white/10 bg-card p-7"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <modulo.icono className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{modulo.titulo}</h3>
              <p className="mt-2 text-white/80">{modulo.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}