// src/components/sistema/BotonTema.tsx
// Botón sol/luna para pasar del modo oscuro al claro y volver.
// La elección queda guardada en este navegador; el script de src/app/layout.tsx la aplica
// antes de dibujar la página, así no se ve un parpadeo al cargar.
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const CLAVE_TEMA = "memopsy-tema";

export default function BotonTema() {
  // null hasta leer el tema en el navegador (en el servidor no se sabe)
  const [claro, setClaro] = useState<boolean | null>(null);

  useEffect(() => {
    setClaro(document.documentElement.classList.contains("claro"));
  }, []);

  const cambiar = () => {
    const nuevo = !claro;
    document.documentElement.classList.toggle("claro", nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo ? "claro" : "oscuro");
    } catch {
      // Navegación privada o almacenamiento bloqueado: el cambio vale hasta recargar
    }
    setClaro(nuevo);
  };

  const texto = claro ? "Pasar a modo oscuro" : "Pasar a modo claro";
  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={texto}
      title={texto}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-crema transition-colors hover:border-primary/60 hover:text-dorado"
    >
      {claro === null ? <span className="h-5 w-5" /> : claro ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
