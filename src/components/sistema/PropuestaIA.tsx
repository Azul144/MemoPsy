"use client";

// src/components/sistema/PropuestaIA.tsx
// Botón «Ordenar con IA» (RF 2.3): pide la propuesta de estructura y la muestra al lado del texto original.
// No reemplaza nada hasta que el psicólogo la acepta.
import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, ShieldAlert, Sparkles, X } from "lucide-react";
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
  // null mientras se consulta si el servidor tiene la clave de la IA
  const [configurada, setConfigurada] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/informes/estructurar")
      .then((r) => (r.ok ? r.json() : { configurada: false }))
      .then((datos) => setConfigurada(Boolean(datos.configurada)))
      .catch(() => setConfigurada(false));
  }, []);

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
        disabled={disabled || cargando || !configurada || !texto.trim()}
        onClick={pedirPropuesta}
        className="border-dorado text-dorado hover:bg-primary hover:text-primary-foreground"
      >
        {cargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {cargando ? "Ordenando..." : "Ordenar con IA"}
      </Button>

      {configurada === false ? (
        <p className="flex items-start gap-2 text-sm text-tenue">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          La IA no está configurada en este servidor. Podés ordenar la nota a mano.
        </p>
      ) : (
        // Ley 25.326: el profesional tiene que saber que el texto sale del sistema antes de usarla
        <p className="flex items-start gap-2 text-xs text-tenue">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
          Al usar la IA, el texto de la nota se envía a un servicio externo (Anthropic) para ordenarlo. No se guarda en
          MemoPsy hasta que lo aceptes. Evitá incluir nombre, DNI u otros datos que identifiquen al paciente.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-aviso">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {propuesta !== null && (
        <div className="space-y-3 rounded-md border border-dorado/40 bg-background p-4">
          <p className="text-sm text-suave">
            Revisá la propuesta antes de usarla. Si la aceptás, reemplaza el contenido y lo podés seguir editando.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-tenue">Tu texto</p>
              <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-borde p-3 text-sm text-suave">
                {original}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-dorado">Propuesta de la IA</p>
              <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-dorado/60 p-3 text-sm text-foreground">
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
              className="border-borde-fuerte text-suave hover:bg-superficie hover:text-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={aceptar} className="bg-primary text-primary-foreground hover:bg-opacity-80">
              <Check className="mr-2 h-4 w-4" />
              Usar esta versión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
