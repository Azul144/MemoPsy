// src/lib/utils.ts
// cn(): combina clases de Tailwind y resuelve las que se pisan (la usan los componentes de src/components/ui).
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
