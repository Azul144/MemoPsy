"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropuestaIAProps {
  // Texto actual del campo Contenido, que es lo que se manda a ordenar
  texto: string;
  // Se llama solo cuando el profesional acepta la propuesta
  onAceptar: (textoNuevo: string) => void;
  disabled?: boolean;
}

// Pide a la IA una versión ordenada de la nota y la muestra al lado del original.
// Nada cambia en el formulario hasta que el profesional toca "Usar esta versión".
export default function PropuestaIA({ texto, onAceptar, disabled }: PropuestaIAProps) {
  const [cargando, setCargando] = useState(false);
  const [propuesta, setPropuesta] = useState<string | null>(null);
  const [original, setOriginal] = useState("");
  const [error, setError] = useState("");

  const pedirPropuesta = async () => {
    setCargando(true);
    setError("");
    setPropuesta(null);
    try {
      const respuesta = await fetch("/api/informes/estructurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        // Las rutas responden con "message"; el middleware de acceso, con "error"
        setError(datos.message || datos.error || `No se pudo obtener la propuesta de la IA (error ${respuesta.status}).`);
        return;
      }
      setOriginal(texto);
      setPropuesta(datos.texto);
    } catch {
      setError("Error de conexión. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const aceptar = () => {
    if (propuesta) onAceptar(propuesta);
    setPropuesta(null);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || cargando || !texto.trim()}
        onClick={pedirPropuesta}
        className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A] hover:text-[#1D3434]"
      >
        {cargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {cargando ? "Ordenando..." : "Ordenar con IA"}
      </Button>

      {error && (
        <p className="flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {propuesta !== null && (
        <div className="space-y-3 rounded-md border border-[#F1C77A]/40 bg-[#152A2A] p-4">
          <p className="text-sm text-gray-300">
            Revisá la propuesta antes de usarla. Si la aceptás, reemplaza el contenido y lo podés seguir editando.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tu texto</p>
              <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-gray-700 p-3 text-sm text-gray-300">
                {original}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F1C77A]">Propuesta de la IA</p>
              <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[#F1C77A]/60 p-3 text-sm text-white">
                {propuesta}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPropuesta(null)}
              className="border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={aceptar} className="bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">
              <Check className="mr-2 h-4 w-4" />
              Usar esta versión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
