// src/components/RequisitosPassword.tsx
// Lista de requisitos que se va tildando mientras la persona escribe la contraseña.
import { Check, X } from "lucide-react";
import { REQUISITOS_PASSWORD } from "@/lib/validaciones/password";

export default function RequisitosPassword({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1 text-sm" aria-live="polite">
      {REQUISITOS_PASSWORD.map((requisito) => {
        const ok = requisito.cumple(password);
        return (
          <li key={requisito.id} className={`flex items-center gap-2 ${ok ? "text-primary" : "text-white/70"}`}>
            {ok ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
            <span>
              {requisito.texto}
              <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
