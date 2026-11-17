"use client"
// Ayuda en crisis: barra fija con los teléfonos, mosaico de "¿Qué te está pasando?" y, para cada
// situación, pasos breves y un ejercicio guiado (respiración o 5-4-3-2-1). En el celular la guía
// se abre en su propia vista; en la computadora, al costado del mosaico.
// Todo ocurre en el navegador: no se guarda ni se envía nada.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  CloudFog,
  CloudRain,
  Flame,
  HandHeart,
  HeartHandshake,
  Pause,
  Phone,
  Play,
  ShieldAlert,
  Square,
  Volume2,
  VolumeX,
  Wind,
  type LucideIcon,
} from "lucide-react"
import LogoMemoPsy, { IsotipoMemoPsy } from "@/components/comunes/LogoMemoPsy"
import { GUIAS, LINEAS_AYUDA, type GuiaCrisis } from "@/lib/crisis/contenido"
import { cn } from "@/lib/utils"
import { useVoz } from "./useVoz"

// Ícono de cada situación del mosaico
const ICONOS: Record<string, LucideIcon> = {
  dano: ShieldAlert,
  panico: Wind,
  angustia: CloudRain,
  enojo: Flame,
  desconexion: CloudFog,
  acompanar: HandHeart,
}

// Todas las líneas, con su descripción (dentro de la guía de riesgo)
function Lineas() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {LINEAS_AYUDA.map((l) => (
        <li key={l.numero}>
          <a
            href={`tel:${l.marcar}`}
            className={cn(
              "flex h-full items-center gap-3 rounded-2xl border p-3 transition-colors",
              l.urgente ? "border-red-400/50 bg-red-500/15 hover:bg-red-500/25" : "border-borde bg-card hover:border-dorado/60",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                l.urgente ? "bg-red-500 text-white" : "bg-primary text-primary-foreground",
              )}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold text-crema">{l.numero}</span>
              <span className="block text-sm font-semibold text-crema/90">{l.nombre}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

// Barra fija: las líneas urgentes siempre a mano y el resto en «Más líneas»
function BarraTelefonos() {
  const [abierta, setAbierta] = useState(false)
  const urgentes = LINEAS_AYUDA.filter((l) => l.urgente)
  const otras = LINEAS_AYUDA.filter((l) => !l.urgente)
  return (
    <div className="sticky top-0 z-30 border-b border-borde bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Link href="/" aria-label="Ir a la portada de MemoPsy" className="mr-auto shrink-0">
          <span className="sm:hidden">
            <IsotipoMemoPsy size={34} />
          </span>
          <span className="hidden sm:block">
            <LogoMemoPsy tamano="sm" />
          </span>
        </Link>
        {urgentes.map((l) => (
          <a
            key={l.numero}
            href={`tel:${l.marcar}`}
            title={l.detalle}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:px-4"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {l.numero}
            <span className="hidden font-semibold md:inline">· {l.nombre}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          aria-expanded={abierta}
          className="inline-flex items-center gap-1 rounded-full border border-dorado/60 px-3 py-2 text-sm font-semibold text-dorado transition-colors hover:bg-primary/10 sm:px-4"
        >
          <span className="hidden sm:inline">Más líneas</span>
          <span className="sm:hidden">Más</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", abierta && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      {abierta && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {otras.map((l) => (
              <li key={l.numero}>
                <a
                  href={`tel:${l.marcar}`}
                  className="flex items-center gap-3 rounded-2xl border border-borde bg-card p-3 transition-colors hover:border-dorado/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold text-crema">{l.numero}</span>
                    <span className="block text-sm font-semibold text-crema/90">{l.nombre}</span>
                    <span className="block text-sm text-crema/65">{l.detalle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Figura que respira en bucle, como un GIF de referencia: el aire entra por la nariz (puntos que bajan),
// el pecho se infla, y el aire sale por la boca (ondas que se abren). El ciclo está en globals.css (.resp-*).
function FiguraRespiracion({ pausada }: { pausada: boolean }) {
  return (
    <div className={cn("resp-ciclo mx-auto my-4 w-full max-w-[15rem]", pausada && "resp-pausada")} aria-hidden="true">
      <svg viewBox="0 0 200 210" className="w-full">
        {/* Anillo que acompaña el ritmo */}
        <circle className="resp-anillo" cx="100" cy="112" r="92" fill="none" stroke="var(--dorado)" strokeWidth="2" strokeDasharray="4 7" />
        {/* Aire que entra por la nariz */}
        <g className="resp-entra" fill="var(--info)">
          <circle cx="92" cy="40" r="3" />
          <circle cx="100" cy="30" r="3" />
          <circle cx="108" cy="40" r="3" />
          <path d="M96 52 L100 60 L104 52" fill="none" stroke="var(--info)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* Cuerpo y pecho que se infla */}
        <path d="M38 210 C38 166 66 148 100 148 C134 148 162 166 162 210 Z" fill="var(--crema)" fillOpacity="0.16" stroke="var(--crema)" strokeOpacity="0.45" strokeWidth="2" />
        <ellipse className="resp-pecho" cx="100" cy="182" rx="34" ry="22" fill="var(--dorado)" fillOpacity="0.45" />
        {/* Cabeza */}
        <circle cx="100" cy="98" r="34" fill="var(--crema)" fillOpacity="0.16" stroke="var(--crema)" strokeOpacity="0.45" strokeWidth="2" />
        <circle cx="88" cy="92" r="2.6" fill="var(--crema)" />
        <circle cx="112" cy="92" r="2.6" fill="var(--crema)" />
        <path d="M100 96 L97 104 L101 105" fill="none" stroke="var(--crema)" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="100" cy="115" rx="5" ry="3.2" fill="var(--crema)" fillOpacity="0.7" />
        {/* Aire que sale por la boca */}
        <g className="resp-sale" fill="none" stroke="var(--crema)" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round">
          <path d="M88 126 Q100 132 112 126" />
          <path d="M82 134 Q100 142 118 134" />
          <path d="M76 142 Q100 152 124 142" />
        </g>
      </svg>
      <div className="mt-3 grid text-xl font-semibold text-crema">
        <span className="resp-texto-entra col-start-1 row-start-1">Inhalá por la nariz</span>
        <span className="resp-texto-sale col-start-1 row-start-1">Soltá por la boca</span>
      </div>
    </div>
  )
}

// Aviso cuando el dispositivo no pudo leer en voz alta
function AvisoSinVoz() {
  return (
    <p role="status" className="mt-3 text-sm text-aviso">
      Este dispositivo no tiene una voz para leer en voz alta. Podés seguir los pasos leyendo, o probar desde otro navegador o desde el celular.
    </p>
  )
}

// Interruptor «Con voz» de los ejercicios
function BotonVoz({ activa, onCambiar }: { activa: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCambiar(!activa)}
      aria-pressed={activa}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        activa ? "border-dorado bg-primary/15 text-dorado" : "border-borde text-crema/70 hover:text-dorado",
      )}
    >
      {activa ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
      {activa ? "Con voz" : "Sin voz"}
    </button>
  )
}

// Respiración guiada: tomar aire 4 segundos y soltarlo 6 (la exhalación larga calma el cuerpo)
function Respiracion() {
  const { soportada, sinVoz, decir, callar } = useVoz()
  const [conVoz, setConVoz] = useState(true)
  const [activa, setActiva] = useState(false)
  const [estado, setEstado] = useState<{ fase: "inhala" | "exhala"; segundos: number }>({ fase: "inhala", segundos: 4 })
  const { fase, segundos } = estado
  // Cada vez que se empieza, la figura vuelve al inicio del ciclo (se monta de nuevo con otra key)
  const [vuelta, setVuelta] = useState(0)

  // La cuenta se calcula con el tiempo transcurrido desde que arrancó, el mismo reloj que la animación
  // de la figura: así no se desfasan aunque el navegador demore algún intervalo.
  useEffect(() => {
    if (!activa) return
    const inicio = performance.now()
    const t = setInterval(() => {
      const enCiclo = ((performance.now() - inicio) / 1000) % 10
      setEstado(
        enCiclo < 4
          ? { fase: "inhala", segundos: Math.ceil(4 - enCiclo) }
          : { fase: "exhala", segundos: Math.ceil(10 - enCiclo) },
      )
    }, 200)
    return () => clearInterval(t)
  }, [activa, vuelta])

  // Con voz: indica cada cambio de fase, así se puede respirar con los ojos cerrados.
  // La primera frase se dice en el mismo toque de «Empezar» (el iPhone solo deja hablar así);
  // las siguientes, cuando cambia la fase.
  const ultimaFase = useRef<"inhala" | "exhala" | null>(null)
  const FRASE = { inhala: "Tomá aire por la nariz", exhala: "Soltalo despacio por la boca" } as const

  useEffect(() => {
    if (!activa || !conVoz || ultimaFase.current === fase) return
    ultimaFase.current = fase
    decir(FRASE[fase])
  }, [fase, activa, conVoz, decir]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => callar(), [callar])

  const empezar = () => {
    if (conVoz) decir(FRASE.inhala)
    ultimaFase.current = "inhala"
    setEstado({ fase: "inhala", segundos: 4 })
    setVuelta((v) => v + 1)
    setActiva(true)
  }
  const pausar = () => {
    setActiva(false)
    ultimaFase.current = null
    callar()
  }

  return (
    <div className="rounded-2xl border border-borde bg-card p-5 text-center">
      <h3 className="font-semibold text-crema">Respiración lenta</h3>
      <p className="mt-1 text-sm text-crema/70">Tomá aire por la nariz en 4 tiempos y soltalo por la boca en 6. Seguí a la figura.</p>

      <FiguraRespiracion key={vuelta} pausada={vuelta > 0 && !activa} />

      <p aria-live="polite" className="min-h-[2.5rem] text-lg text-crema/80">
        {activa ? (
          <>
            {fase === "inhala" ? "Tomá aire" : "Soltalo despacio"}: <span className="font-semibold text-crema">{segundos}</span>
          </>
        ) : vuelta > 0 ? (
          "En pausa. Seguí cuando quieras."
        ) : (
          "Mirá el ejemplo y, cuando quieras, empezamos juntos/as."
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => (activa ? pausar() : empezar())}
          className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {activa ? "Pausar" : "Empezar a respirar"}
        </button>
        {soportada && (
          <BotonVoz
            activa={conVoz}
            onCambiar={(v) => {
              setConVoz(v)
              if (!v) callar()
            }}
          />
        )}
      </div>
      {soportada && conVoz && !activa && !sinVoz && (
        <p className="mt-3 text-sm text-crema/60">Una voz te va a indicar cuándo tomar y soltar el aire, para que puedas cerrar los ojos.</p>
      )}
      {sinVoz && <AvisoSinVoz />}
    </div>
  )
}

// 5-4-3-2-1: volver al presente con los sentidos
const SENTIDOS = [
  "Mirá a tu alrededor y nombrá 5 cosas que ves.",
  "Tocá y nombrá 4 cosas que podés sentir (la ropa, la silla, el piso...).",
  "Escuchá y nombrá 3 sonidos.",
  "Nombrá 2 olores que sentís, o 2 que te gusten.",
  "Nombrá 1 sabor, o algo bueno que te puedas decir ahora.",
]
const FIN_SENTIDOS = "Muy bien. Notá cómo estás ahora, aunque sea un poco distinto."

function Sentidos() {
  const { soportada, sinVoz, decir, callar } = useVoz()
  const [conVoz, setConVoz] = useState(false)
  const [paso, setPaso] = useState(0)
  const terminado = paso >= SENTIDOS.length
  const texto = terminado ? FIN_SENTIDOS : SENTIDOS[paso]

  useEffect(() => () => callar(), [callar])

  // Con voz: lee cada paso al tocar el botón (en el mismo toque, como pide el iPhone)
  const siguiente = () => {
    const nuevo = terminado ? 0 : paso + 1
    setPaso(nuevo)
    if (conVoz) decir(nuevo >= SENTIDOS.length ? FIN_SENTIDOS : SENTIDOS[nuevo])
  }

  return (
    <div className="rounded-2xl border border-borde bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-crema">Volver al presente: 5-4-3-2-1</h3>
          <p className="mt-1 text-sm text-crema/70">Hacelo despacio, en voz alta si podés.</p>
        </div>
        {soportada && (
          <BotonVoz
            activa={conVoz}
            onCambiar={(v) => {
              setConVoz(v)
              if (v) decir(texto)
              else callar()
            }}
          />
        )}
      </div>
      {sinVoz && <AvisoSinVoz />}
      <p aria-live="polite" className="my-5 min-h-[4rem] text-xl font-semibold leading-snug text-crema">
        {texto}
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-crema/60">{terminado ? "" : `Paso ${paso + 1} de ${SENTIDOS.length}`}</span>
        <button
          type="button"
          onClick={siguiente}
          className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {terminado ? "Volver a empezar" : "Listo, siguiente"}
        </button>
      </div>
    </div>
  )
}

// Partes de la guía en el orden en que se leen. Los teléfonos van escritos como se dicen.
type Parte = { clave: "apertura" | "lineas" | "cierre" | number; texto: string }

function partesDeLaGuia(guia: GuiaCrisis): Parte[] {
  const partes: Parte[] = [{ clave: "apertura", texto: `${guia.titulo}. ${guia.apertura}` }]
  if (guia.riesgo) {
    partes.push({
      clave: "lineas",
      texto:
        "Llamá ahora. Si estás en peligro, llamá al nueve uno uno. También podés llamar gratis, a cualquier hora, a la línea nacional de salud mental: cero ochocientos, nueve nueve nueve, cero cero nueve uno. Los botones para llamar están arriba de todo.",
    })
  }
  guia.pasos.forEach((paso, i) => partes.push({ clave: i, texto: `Paso ${i + 1}. ${paso}` }))
  partes.push({ clave: "cierre", texto: guia.cierre })
  return partes
}

function Guia({ guia }: { guia: GuiaCrisis }) {
  const { soportada, sinVoz, decir, callar, turno } = useVoz()
  const [lectura, setLectura] = useState<"quieta" | "leyendo" | "pausada">("quieta")
  const [leyendo, setLeyendo] = useState<Parte["clave"] | null>(null)

  useEffect(() => () => callar(), [callar])

  const leerDesde = (partes: Parte[], i: number) => {
    if (i >= partes.length) {
      setLectura("quieta")
      setLeyendo(null)
      return
    }
    setLeyendo(partes[i].clave)
    const terminar = () => {
      setLectura("quieta")
      setLeyendo(null)
    }
    decir(
      partes[i].texto,
      () => {
        // Una pausa breve entre paso y paso; si mientras tanto se detuvo o habló otro ejercicio, no sigue
        const t = turno()
        setTimeout(() => (turno() === t ? leerDesde(partes, i + 1) : terminar()), 700)
      },
      terminar,
    )
  }

  const escuchar = () => {
    setLectura("leyendo")
    leerDesde(partesDeLaGuia(guia), 0)
  }
  const pausarOSeguir = () => {
    if (lectura === "leyendo") {
      window.speechSynthesis.pause()
      setLectura("pausada")
    } else {
      window.speechSynthesis.resume()
      setLectura("leyendo")
    }
  }
  const detener = () => {
    callar()
    setLectura("quieta")
    setLeyendo(null)
  }

  const resaltada = (clave: Parte["clave"]) => leyendo === clave && "ring-2 ring-dorado ring-offset-2 ring-offset-background"

  return (
    <article className="space-y-5">
      <div>
        <h2 className="titulo text-2xl text-crema sm:text-3xl">{guia.titulo}</h2>

        {soportada && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {lectura === "quieta" ? (
              <button
                type="button"
                onClick={escuchar}
                className="inline-flex items-center gap-2 rounded-full border border-dorado/70 px-4 py-2 font-semibold text-dorado transition-colors hover:bg-primary/10"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                Escuchar los pasos
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={pausarOSeguir}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {lectura === "leyendo" ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {lectura === "leyendo" ? "Pausar" : "Seguir"}
                </button>
                <button
                  type="button"
                  onClick={detener}
                  className="inline-flex items-center gap-2 rounded-full border border-borde px-4 py-2 text-crema/80 transition-colors hover:text-dorado"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Detener
                </button>
              </>
            )}
          </div>
        )}

        {sinVoz && <AvisoSinVoz />}

        <p className={cn("mt-4 rounded-xl text-lg leading-relaxed text-crema/85 transition-shadow", resaltada("apertura"))}>{guia.apertura}</p>
      </div>

      {guia.riesgo && (
        <div className={cn("rounded-2xl border border-red-400/50 bg-red-500/10 p-4 transition-shadow", resaltada("lineas"))}>
          <p className="mb-3 flex items-center gap-2 font-semibold text-crema">
            <ShieldAlert className="h-5 w-5 text-peligro" aria-hidden="true" />
            Llamá ahora. Hay personas preparadas para ayudarte.
          </p>
          <Lineas />
        </div>
      )}

      <ol className="space-y-3">
        {guia.pasos.map((paso, i) => (
          <li key={i} className={cn("flex gap-3 rounded-2xl bg-card p-4 transition-shadow", resaltada(i))}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="leading-relaxed text-crema/90">{paso}</span>
          </li>
        ))}
      </ol>

      {guia.ejercicio === "respiracion" && <Respiracion />}
      {guia.ejercicio === "sentidos" && <Sentidos />}

      <p className={cn("rounded-2xl border border-dorado/40 bg-primary/10 p-4 leading-relaxed text-crema/90 transition-shadow", resaltada("cierre"))}>
        {guia.cierre}
      </p>
    </article>
  )
}

function Opcion({ guia, activa, ancho, onElegir }: { guia: GuiaCrisis; activa: boolean; ancho?: boolean; onElegir: () => void }) {
  const Icono = ICONOS[guia.id] ?? HeartHandshake
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={activa}
      className={cn(
        "flex h-full w-full rounded-2xl border p-4 text-left transition-colors",
        ancho ? "items-center gap-4" : "flex-col gap-3",
        guia.riesgo
          ? activa
            ? "border-red-300 bg-red-500/30"
            : "border-red-400/60 bg-red-500/15 hover:bg-red-500/25"
          : activa
            ? "border-dorado bg-primary/15"
            : "border-borde bg-card hover:border-dorado/60",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          guia.riesgo ? "bg-red-500 text-white" : "bg-primary/15 text-dorado",
        )}
      >
        <Icono className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug text-crema">{guia.titulo}</span>
        <span className="mt-1 block text-sm leading-snug text-crema/65">{guia.subtitulo}</span>
      </span>
    </button>
  )
}

export default function AyudaCrisis() {
  const [elegida, setElegida] = useState<GuiaCrisis | null>(null)

  const elegir = (g: GuiaCrisis) => {
    setElegida(g)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <main className="tema-oscuro min-h-screen bg-background text-foreground">
      <BarraTelefonos />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* Opciones: en el celular se ocultan mientras se lee una guía */}
        <section className={cn(elegida && "hidden lg:block")} aria-labelledby="que-pasa">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-dorado">
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            Ayuda en crisis
          </p>
          <h1 id="que-pasa" className="titulo mt-2 text-3xl text-crema">
            ¿Qué te está pasando?
          </h1>
          <p className="mt-2 mb-5 text-crema/75">Elegí lo que más se parece. Si estás en peligro ahora, llamá con los botones de arriba.</p>
          <ul className="grid grid-cols-2 gap-3">
            {GUIAS.filter((g) => !g.riesgo && g.id !== "acompanar").map((g) => (
              <li key={g.id}>
                <Opcion guia={g} activa={elegida?.id === g.id} onElegir={() => elegir(g)} />
              </li>
            ))}
          </ul>
          {/* Debajo, a lo ancho: la situación de riesgo (destacada) y la de quien acompaña */}
          <ul className="mt-3 space-y-3">
            {GUIAS.filter((g) => g.riesgo || g.id === "acompanar").map((g) => (
              <li key={g.id}>
                <Opcion guia={g} activa={elegida?.id === g.id} ancho onElegir={() => elegir(g)} />
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-crema/60 transition-colors hover:text-dorado">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </section>

        {/* Guía: vista propia en el celular, panel al costado en la computadora */}
        <section className={cn(!elegida && "hidden lg:block")} aria-live="polite">
          <div className="lg:sticky lg:top-24">
            {elegida ? (
              <>
                <button
                  type="button"
                  onClick={() => setElegida(null)}
                  className="mb-5 inline-flex items-center gap-2 rounded-full border border-borde px-4 py-2 text-sm text-crema/80 transition-colors hover:text-dorado lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Volver a las opciones
                </button>
                <Guia key={elegida.id} guia={elegida} />
              </>
            ) : (
              <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-3xl border border-dashed border-borde p-8 text-center">
                <HeartHandshake className="h-10 w-10 text-dorado" aria-hidden="true" />
                <p className="mt-4 text-xl font-semibold text-crema">Vamos paso a paso</p>
                <p className="mt-2 max-w-sm text-crema/70">
                  Elegí a la izquierda lo que te está pasando y acá vas a ver qué hacer ahora, con un ejercicio para acompañarte.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <p className="border-t border-borde pt-6 text-sm leading-relaxed text-crema/60">
          Esta página da orientación general para atravesar el momento: no reemplaza la atención de un/a profesional, una guardia
          ni un servicio de emergencias. Si estás en tratamiento, contale a tu psicólogo/a lo que pasó. MemoPsy no guarda nada de
          lo que hagas en esta página.
        </p>
      </footer>
    </main>
  )
}
