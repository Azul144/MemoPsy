// src/lib/avisos.tsx
// Avisos y confirmaciones con el estilo de MemoPsy,
// en lugar de alert() y confirm() del navegador ("localhost dice...").
"use client";

import toast from "react-hot-toast";

export function avisoExito(mensaje: string) {
  toast.success(mensaje);
}

export function avisoError(mensaje: string) {
  toast.error(mensaje);
}

// Muestra una ventanita con "Cancelar" y "Sí, continuar".
// Devuelve true si la persona confirma.  Uso: if (!(await confirmar("¿Seguro?"))) return;
export function confirmar(mensaje: string, textoConfirmar = "Sí, continuar"): Promise<boolean> {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          role="alertdialog"
          aria-live="assertive"
          className={`w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-foreground/10 bg-card p-5 text-crema shadow-2xl shadow-black/40 transition-all ${
            t.visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="leading-relaxed">{mensaje}</p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold transition-colors hover:border-crema/40"
            >
              Cancelar
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {textoConfirmar}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  });
}
