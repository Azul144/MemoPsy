"use client"
// src/components/landing/AnimarAlScroll.tsx
// Hace aparecer, al bajar por la landing, los elementos marcados con data-revelar.
// Con data-revelar="izquierda" o "derecha" entran de costado; con --retraso se escalonan.
// Si el navegador no tiene JavaScript, todo se ve igual, sin animación.
import { useEffect } from "react"

export default function AnimarAlScroll() {
  useEffect(() => {
    const elementos = document.querySelectorAll<HTMLElement>("[data-revelar]")
    if (!("IntersectionObserver" in window)) return

    document.documentElement.classList.add("con-revelar")
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          entrada.target.classList.add("revelado")
          observador.unobserve(entrada.target)
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    elementos.forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [])

  return null
}
