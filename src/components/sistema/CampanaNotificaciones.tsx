// src/components/sistema/CampanaNotificaciones.tsx
// RF 3.2 / RF 3.3 - Campanita de la barra superior: muestra los avisos de turnos
// (reprogramados, cancelados y recordatorios) y cuántos hay sin leer.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CalendarClock, CalendarX, ClipboardCheck, MessageSquare, RefreshCw } from "lucide-react";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
}

// Cada cuánto se vuelve a consultar si hay avisos nuevos
const INTERVALO_MS = 60_000;

const ICONOS: Record<string, { icono: typeof Bell; color: string }> = {
  CANCELACION: { icono: CalendarX, color: "text-peligro" },
  REPROGRAMACION: { icono: RefreshCw, color: "text-naranja" },
  RECORDATORIO: { icono: CalendarClock, color: "text-dorado" },
  SEGUIMIENTO: { icono: ClipboardCheck, color: "text-dorado" },
  RESPUESTA_ACTIVIDAD: { icono: MessageSquare, color: "text-exito" },
};

function haceCuanto(fechaIso: string): string {
  const minutos = Math.round((Date.now() - new Date(fechaIso).getTime()) / 60_000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

export default function CampanaNotificaciones() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!res.ok) return;
      const datos = await res.json();
      setNotificaciones(datos.notificaciones ?? []);
      setSinLeer(datos.sinLeer ?? 0);
    } catch {
      // Sin conexión: se vuelve a intentar en el próximo intervalo
    }
  }, []);

  // Al entrar a cada pantalla y cada minuto
  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [cargar, ruta]);

  // Cierra el panel al hacer clic afuera o al cambiar de página
  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClic);
    return () => document.removeEventListener("mousedown", alHacerClic);
  }, []);
  useEffect(() => setAbierto(false), [ruta]);

  // Al abrir el panel, los avisos se dan por leídos (se siguen viendo resaltados hasta cerrarlo)
  async function alternar() {
    const abrir = !abierto;
    setAbierto(abrir);
    if (!abrir) {
      setNotificaciones((lista) => lista.map((n) => ({ ...n, leida: true })));
      return;
    }
    if (sinLeer > 0) {
      setSinLeer(0);
      try {
        await fetch("/api/notificaciones", { method: "PATCH" });
      } catch {
        // Si falla, la próxima consulta los vuelve a mostrar como no leídos
      }
    }
  }

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-crema transition-colors hover:border-primary/60"
      >
        <Bell className="h-5 w-5" />
        {sinLeer > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-[#ffffff]">
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-foreground/10 bg-card text-crema shadow-2xl shadow-black/40">
          <div className="border-b border-foreground/10 px-4 py-3">
            <p className="font-semibold">Notificaciones</p>
          </div>
          {notificaciones.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-crema/65">No tenés avisos por ahora.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notificaciones.map((n) => {
                const { icono: Icono, color } = ICONOS[n.tipo] ?? { icono: Bell, color: "text-crema/70" };
                return (
                  <li
                    key={n.id}
                    className={`flex gap-3 border-b border-foreground/5 px-4 py-3 last:border-0 ${n.leida ? "" : "bg-primary/10"}`}
                  >
                    <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{n.titulo}</p>
                      <p className="text-sm leading-snug text-crema/80">{n.mensaje}</p>
                      <p className="mt-1 text-xs text-crema/50">{haceCuanto(n.fecha)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
