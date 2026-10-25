import { Lock, FileText, CalendarDays, Bell, Mail } from "lucide-react";

// Mosaico de funciones: cada tarjeta muestra una "mini pantalla" de lo que hace el sistema
export default function Funciones() {
  return (
    <section id="funciones" className="seccion-crema bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="titulo max-w-2xl text-4xl text-crema sm:text-5xl">
          Todo lo que tu consultorio necesita, en una sola plataforma
        </h2>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          {/* Notas cifradas: tarjeta grande */}
          <article className="group relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-superficie to-card p-8 md:col-span-4">
            <Encabezado icono={Lock} titulo="Notas cifradas">
              Cada nota clínica se guarda cifrada y solo la ve el psicólogo que la escribió. Cumple con la Ley 25.326.
            </Encabezado>

            {/* Mini nota */}
            <div className="mt-8 rounded-2xl border border-foreground/10 bg-background/70 p-5 transition-transform duration-500 group-hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-crema">Sesión 12 · Tomás A.</span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-exito">
                  <Lock className="h-3 w-3" /> Cifrada
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-2.5 w-11/12 rounded-full bg-foreground/15" />
                <div className="h-2.5 w-4/5 rounded-full bg-foreground/15" />
                <div className="h-2.5 w-2/3 rounded-full bg-foreground/10" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-dorado">ansiedad</span>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-dorado">seguimiento</span>
              </div>
            </div>
          </article>

          {/* Agenda */}
          <article className="group relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-card p-8 md:col-span-2">
            <Encabezado icono={CalendarDays} titulo="Agenda terapéutica">
              Turnos sin superposiciones de horario.
            </Encabezado>

            {/* Mini calendario */}
            <div className="mt-8 space-y-2.5">
              {[
                { hora: "09:00", nombre: "Sofía R.", libre: false },
                { hora: "10:00", nombre: "Libre", libre: true },
                { hora: "11:00", nombre: "Tomás A.", libre: false },
              ].map((turno) => (
                <div
                  key={turno.hora}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-transform duration-500 group-hover:translate-x-1 ${
                    turno.libre ? "border border-dashed border-foreground/20 text-crema/50" : "bg-primary/15 text-crema"
                  }`}
                >
                  <span className="font-semibold text-dorado">{turno.hora}</span>
                  {turno.nombre}
                </div>
              ))}
            </div>
          </article>

          {/* Recordatorios */}
          <article className="group relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-card p-8 md:col-span-3">
            <Encabezado icono={Bell} titulo="Recordatorios">
              Tus pacientes reciben un email y un aviso en el sistema 24 horas antes de cada sesión.
            </Encabezado>

            {/* Mini email de recordatorio */}
            <div className="mt-8 max-w-xs rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-crema shadow-lg transition-transform duration-500 group-hover:-translate-y-1">
              <span className="flex items-center gap-2 text-xs text-crema/60">
                <Mail className="h-4 w-4 text-dorado" />
                Recordatorio de tu turno en MemoPsy
              </span>
              <p className="mt-2">Te recordamos que tenés turno con Carla Benítez el vie 23/10 a las 12:00.</p>
            </div>
          </article>

          {/* Informes */}
          <article className="group relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-card to-superficie p-8 md:col-span-3">
            <Encabezado icono={FileText} titulo="Informes">
              El historial del paciente en un clic, antes de cada sesión.
            </Encabezado>

            {/* Mini lista de informes */}
            <ul className="mt-8 divide-y divide-foreground/10 rounded-2xl border border-foreground/10 bg-background/60">
              {[
                ["Informe de evolución", "12 oct"],
                ["Pautas para la semana", "5 oct"],
                ["Primera entrevista", "28 sep"],
              ].map(([titulo, fecha]) => (
                <li key={titulo} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-3 text-crema">
                    <FileText className="h-4 w-4 text-dorado" />
                    {titulo}
                  </span>
                  <span className="text-crema/50">{fecha}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Encabezado({
  icono: Icono,
  titulo,
  children,
}: {
  icono: React.ElementType;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
        <Icono className="h-6 w-6 text-dorado" />
      </span>
      <h3 className="mt-5 text-2xl font-semibold text-crema">{titulo}</h3>
      <p className="mt-2 max-w-md leading-relaxed text-crema/70">{children}</p>
    </div>
  );
}
