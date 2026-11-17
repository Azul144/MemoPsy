"use client"
// Lectura en voz alta para la página de crisis, con la síntesis de voz del navegador (Web Speech API).
// No se instala nada y MemoPsy no envía el texto a ningún servicio propio (algunas voces del navegador
// pueden funcionar en línea, igual que el dictado). La voz tiene que arrancar con un toque de la persona:
// los navegadores no dejan que hable sola al abrir la página.

import { useCallback, useEffect, useState } from "react"

// Turno de la lectura actual: cada vez que alguien empieza a hablar o se calla, cambia.
// Así una lectura que fue interrumpida no sigue con su próximo paso.
let turnoActual = 0

function elegirVoz(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const es = voces.filter((v) => v.lang.toLowerCase().startsWith("es"))
  return (
    es.find((v) => v.lang.toLowerCase() === "es-ar") ??
    es.find((v) => /latin|419|mx|us/i.test(v.lang) || /latin/i.test(v.name)) ??
    es.find((v) => v.localService) ??
    es[0] ??
    null
  )
}

export function useVoz() {
  const [soportada, setSoportada] = useState(false)
  const [voz, setVoz] = useState<SpeechSynthesisVoice | null>(null)
  // El navegador tiene la función pero no logró hablar (por ejemplo, sin voces instaladas)
  const [sinVoz, setSinVoz] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    setSoportada(true)
    const cargar = () => setVoz(elegirVoz(window.speechSynthesis.getVoices()))
    cargar()
    window.speechSynthesis.addEventListener("voiceschanged", cargar)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargar)
  }, [])

  // Dice un texto. Al terminar llama a alTerminar; si otra lectura (o callar) la cortó, a alInterrumpir.
  const decir = useCallback(
    (texto: string, alTerminar?: () => void, alInterrumpir?: () => void) => {
      if (!soportada) return
      const turno = ++turnoActual
      window.speechSynthesis.cancel()
      const frase = new SpeechSynthesisUtterance(texto)
      frase.lang = voz?.lang ?? "es-AR"
      if (voz) frase.voice = voz
      frase.rate = 0.9 // un poco más lento: tono tranquilo
      let avisado = false
      let empezo = false
      const fin = () => {
        if (avisado) return
        avisado = true
        if (turno === turnoActual) alTerminar?.()
        else alInterrumpir?.()
      }
      // Según el navegador, una lectura cortada termina con "end" o con "error"
      frase.onstart = () => {
        empezo = true
        setSinVoz(false)
      }
      frase.onend = fin
      frase.onerror = fin
      window.speechSynthesis.speak(frase)
      // Sin voces instaladas el navegador no habla ni avisa: si no empezó en 2,5 s, se corta y se informa
      setTimeout(() => {
        if (empezo || avisado || turno !== turnoActual || window.speechSynthesis.paused) return
        turnoActual++
        window.speechSynthesis.cancel()
        setSinVoz(true)
        avisado = true
        alInterrumpir?.()
      }, 2500)
    },
    [soportada, voz],
  )

  const callar = useCallback(() => {
    turnoActual++
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
  }, [])

  // Turno con el que se puede saber si una cadena de lecturas sigue vigente
  const turno = useCallback(() => turnoActual, [])

  return { soportada, sinVoz, decir, callar, turno }
}
