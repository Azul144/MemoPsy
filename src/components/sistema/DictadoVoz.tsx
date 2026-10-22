"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
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
}

function obtenerReconocedor(): (new () => Reconocedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface DictadoVozProps {
  // Recibe cada fragmento ya reconocido; el formulario decide cómo agregarlo al texto.
  onTexto: (texto: string) => void;
  disabled?: boolean;
}

export default function DictadoVoz({ onTexto, disabled }: DictadoVozProps) {
  const [soportado, setSoportado] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [parcial, setParcial] = useState("");
  const reconocedorRef = useRef<Reconocedor | null>(null);
  const onTextoRef = useRef(onTexto);
  onTextoRef.current = onTexto;

  useEffect(() => {
    setSoportado(obtenerReconocedor() !== null);
    return () => reconocedorRef.current?.stop();
  }, []);

  const iniciar = () => {
    const Clase = obtenerReconocedor();
    if (!Clase) return;
    const rec = new Clase();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
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
    rec.onerror = () => setGrabando(false);
    rec.onend = () => {
      setGrabando(false);
      setParcial("");
    };

    reconocedorRef.current = rec;
    rec.start();
    setGrabando(true);
  };

  const detener = () => reconocedorRef.current?.stop();

  // El aviso para navegadores sin soporte se resuelve aparte (issue #3).
  if (!soportado) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={grabando ? detener : iniciar}
        className={cn(
          grabando
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80"
        )}
      >
        {grabando ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
        {grabando ? "Detener dictado" : "Dictar"}
      </Button>
      {grabando && (
        <span className="text-sm text-gray-300">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {parcial || "Escuchando..."}
        </span>
      )}
    </div>
  );
}
