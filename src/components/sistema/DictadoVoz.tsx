"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// La Web Speech API no viene tipada en lib.dom, así que se declara lo mínimo que se usa.
interface ResultadoReconocimiento {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoReconocimiento {
  resultIndex: number;
  results: ArrayLike<ResultadoReconocimiento>;
}
interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoReconocimiento) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function obtenerReconocedor(): (new () => Reconocedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Mensajes para los errores que devuelve el reconocimiento; los demás caen en el genérico.
const MENSAJES_ERROR: Record<string, string> = {
  "not-allowed": "No se dio permiso para usar el micrófono. Podés habilitarlo desde el candado de la barra de direcciones o escribir a mano.",
  "service-not-allowed": "No se dio permiso para usar el micrófono. Podés habilitarlo desde el candado de la barra de direcciones o escribir a mano.",
  "audio-capture": "No se encontró ningún micrófono conectado. Podés escribir a mano.",
  "network": "El dictado necesita conexión a internet. Revisá la conexión o escribí a mano.",
  "no-speech": "No se escuchó nada. Volvé a tocar Dictar y hablá cerca del micrófono.",
};
const MENSAJE_ERROR_GENERICO = "No se pudo usar el dictado. Podés escribir a mano.";
const MENSAJE_SIN_RESPUESTA = "No llega el texto dictado. Revisá la conexión a internet o escribí a mano.";

// Sin internet, Chrome a veces reconoce en el propio equipo y a veces se queda escuchando sin
// dar error. No se bloquea el dictado offline: si en este tiempo no llega ningún resultado,
// se corta y se avisa.
const ESPERA_PRIMER_RESULTADO_MS = 10000;

interface DictadoVozProps {
  // Recibe cada fragmento ya reconocido; el formulario decide cómo agregarlo al texto.
  onTexto: (texto: string) => void;
  disabled?: boolean;
}

export default function DictadoVoz({ onTexto, disabled }: DictadoVozProps) {
  // null mientras no se sabe (en el servidor no hay window), para no mostrar el aviso de más.
  const [soportado, setSoportado] = useState<boolean | null>(null);
  const [aviso, setAviso] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [parcial, setParcial] = useState("");
  const reconocedorRef = useRef<Reconocedor | null>(null);
  const esperaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextoRef = useRef(onTexto);
  onTextoRef.current = onTexto;

  const cancelarEspera = () => {
    if (esperaRef.current) clearTimeout(esperaRef.current);
    esperaRef.current = null;
  };

  // Corta el dictado a la fuerza: colgado, stop() puede no llegar a disparar onend
  const cortarConAviso = (mensaje: string) => {
    cancelarEspera();
    const rec = reconocedorRef.current;
    if (rec) {
      rec.onend = null;
      rec.onerror = null;
      rec.abort();
    }
    setAviso(mensaje);
    setGrabando(false);
    setParcial("");
  };

  useEffect(() => {
    setSoportado(obtenerReconocedor() !== null);
    return () => {
      cancelarEspera();
      reconocedorRef.current?.stop();
    };
  }, []);

  const iniciar = () => {
    const Clase = obtenerReconocedor();
    if (!Clase) return;
    const rec = new Clase();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      cancelarEspera();
      let enCurso = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const texto = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) {
          if (texto) onTextoRef.current(texto);
        } else {
          enCurso += texto + " ";
        }
      }
      setParcial(enCurso.trim());
    };
    rec.onerror = (e) => {
      cancelarEspera();
      // "aborted" es cuando se corta a propósito, no hace falta avisar nada.
      if (e.error !== "aborted") setAviso(MENSAJES_ERROR[e.error] ?? MENSAJE_ERROR_GENERICO);
      setGrabando(false);
    };
    rec.onend = () => {
      cancelarEspera();
      setGrabando(false);
      setParcial("");
    };

    reconocedorRef.current = rec;
    setAviso("");
    try {
      rec.start();
      setGrabando(true);
      esperaRef.current = setTimeout(() => cortarConAviso(MENSAJE_SIN_RESPUESTA), ESPERA_PRIMER_RESULTADO_MS);
    } catch {
      setAviso(MENSAJE_ERROR_GENERICO);
    }
  };

  const detener = () => reconocedorRef.current?.stop();

  if (soportado === null) return null;

  if (!soportado) {
    return (
      <p className="flex items-start gap-2 text-sm text-tenue">
        <MicOff className="mt-0.5 h-4 w-4 shrink-0" />
        Este navegador no permite dictar por voz. Podés escribir a mano, o abrir MemoPsy en Chrome o Edge para usar el dictado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={grabando ? detener : iniciar}
          className={cn(
            grabando
              ? "bg-red-600 text-[#ffffff] hover:bg-red-700"
              : "bg-primary text-primary-foreground hover:bg-opacity-80"
          )}
        >
          {grabando ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {grabando ? "Detener dictado" : "Dictar"}
        </Button>
        {grabando && (
          <span className="text-sm text-suave">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {parcial || "Escuchando..."}
          </span>
        )}
      </div>
      {aviso && (
        <p className="flex items-start gap-2 text-sm text-aviso">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {aviso}
        </p>
      )}
    </div>
  );
}
