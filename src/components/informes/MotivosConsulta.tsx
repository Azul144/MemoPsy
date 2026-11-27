// src/components/informes/MotivosConsulta.tsx
// Botones para marcar con qué vino el paciente a la consulta (ansiedad, estrés, duelo...).
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOTIVOS_CONSULTA, MOTIVOS_VISIBLES } from "@/lib/informes/motivos-consulta";

export default function MotivosConsulta({
  seleccionados,
  onCambiar,
  disabled,
}: {
  seleccionados: string[];
  onCambiar: (motivo: string) => void;
  disabled?: boolean;
}) {
  // Si hay uno marcado entre los ocultos, la lista arranca desplegada
  const [verTodos, setVerTodos] = useState(() => seleccionados.some((m) => MOTIVOS_CONSULTA.indexOf(m as never) >= MOTIVOS_VISIBLES));
  const lista = verTodos ? MOTIVOS_CONSULTA : MOTIVOS_CONSULTA.slice(0, MOTIVOS_VISIBLES);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Motivo de consulta">
      {lista.map((motivo) => {
        const activo = seleccionados.includes(motivo);
        return (
          <button
            key={motivo}
            type="button"
            disabled={disabled}
            aria-pressed={activo}
            onClick={() => onCambiar(motivo)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-borde-fuerte bg-background text-texto-2 hover:border-primary/60 hover:text-foreground",
            )}
          >
            {activo && <Check className="h-3.5 w-3.5" />}
            {motivo}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setVerTodos((v) => !v)}
        className="rounded-full px-3 py-1.5 text-sm text-dorado hover:underline"
      >
        {verTodos ? "Ver menos" : `Ver más (${MOTIVOS_CONSULTA.length - MOTIVOS_VISIBLES})`}
      </button>
    </div>
  );
}
