// src/components/landing/LoQueCambia.tsx
// Sitio público: «Lo que cambia con MemoPsy». Cada fila contrasta un problema del psicólogo
// (lo que mostró el diagnóstico del TIF) con la función del sistema que lo resuelve.
import { Check, X } from "lucide-react";

const filas = [
  { antes: "Notas en papel o en archivos sueltos que se pierden", despues: "Notas dictadas, ordenadas por IA y guardadas cifradas" },
  { antes: "Buscar el historial del paciente en carpetas", despues: "Todo el historial de cada paciente en un clic" },
  { antes: "Pacientes que se olvidan del turno o faltan", despues: "Recordatorio automático por email y WhatsApp" },
  { antes: "Coordinar turnos desde tu WhatsApp personal", despues: "Agenda propia: el paciente confirma o reprograma solo" },
  { antes: "Las tareas entre sesiones se retoman de memoria", despues: "Seguimiento por escrito que el paciente ve y responde" },
  { antes: "Datos sensibles sin ninguna protección", despues: "Cifrado, permisos por rol y registro de cada acceso" },
];

export default function LoQueCambia() {
  return (
    <section id="lo-que-cambia" className="seccion-crema bg-background px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 data-revelar className="titulo text-center text-4xl text-balance text-crema sm:text-5xl">Lo que cambia con MemoPsy</h2>
        <p data-revelar style={{ "--retraso": "120ms" } as React.CSSProperties} className="mx-auto mt-4 max-w-xl text-center text-lg text-balance text-crema/75">
          Los problemas de todos los días en tu consultorio, y cómo los resuelve el sistema.
        </p>

        <div data-revelar className="mt-12 overflow-hidden rounded-[2rem] border border-border bg-card">
          {/* Encabezado de la tabla: solo en pantallas anchas */}
          <div className="hidden grid-cols-2 bg-superficie px-6 py-4 text-sm font-semibold tracking-wider text-crema/60 uppercase md:grid">
            <span>Antes</span>
            <span className="text-dorado">Con MemoPsy</span>
          </div>
          {filas.map((f, i) => (
            <div
              key={f.despues}
              data-revelar="izquierda"
              style={{ "--retraso": `${200 + i * 90}ms` } as React.CSSProperties}
              className={`grid gap-2 px-6 py-4 md:grid-cols-2 md:items-center md:gap-4 ${i > 0 ? "border-t border-border" : "md:border-t md:border-border"}`}
            >
              <span className="flex items-center gap-2 text-crema/55">
                <X className="h-4 w-4 shrink-0 text-red-500" aria-label="Antes" />
                {f.antes}
              </span>
              <span className="flex items-center gap-2 font-medium text-crema">
                <Check className="h-4 w-4 shrink-0 text-exito" aria-label="Con MemoPsy" />
                {f.despues}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
