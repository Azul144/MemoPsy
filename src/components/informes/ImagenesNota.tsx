"use client"
// Imágenes de la nota clínica: dibujos de técnicas proyectivas (persona bajo la lluvia, HTP, etc.),
// fotos de producciones del paciente o material que le sirva en el tratamiento.
//  - ImagenesPendientes: en el alta de la nota, se eligen antes de guardar y se suben al final.
//  - ImagenesNota: en la edición, cada cambio se guarda en el momento.
//  - GaleriaImagenes: solo lectura (detalle de la nota y panel del paciente).
// Cada imagen es privada del psicólogo salvo que se marque "Compartir con el paciente":
// entonces aparece en su informe de seguimiento.

import { useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, Loader2, Trash2, Users, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { avisoError, avisoExito, confirmar } from "@/lib/avisos"
import { cn } from "@/lib/utils"

export interface ImagenGuardada {
  id: string
  nombre: string
  descripcion: string | null
  compartida: boolean
  fechaCreacion: string
  url: string
}

export interface ImagenPendiente {
  clave: string
  archivo: Blob
  nombre: string
  vistaPrevia: string
  descripcion: string
  compartida: boolean
}

const MAX_LADO = 2000
const MAX_IMAGENES = 20

// Achica la foto (las del celular pesan varios MB) y la pasa a JPG, que se puede incluir en el PDF.
// El fondo queda blanco, así los dibujos escaneados en PNG transparente se ven bien.
async function prepararImagen(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("formato"))
      el.src = url
    })
    const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("formato"))), "image/jpeg", 0.85),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

const nombreJpg = (nombre: string) => nombre.replace(/\.[^.]+$/, "") + ".jpg"

// Sube una imagen a una nota ya guardada; devuelve el mensaje de error o null
export async function subirImagen(
  informeId: string,
  imagen: { archivo: Blob; nombre: string; descripcion: string; compartida: boolean },
): Promise<{ imagen?: ImagenGuardada; error?: string }> {
  const datos = new FormData()
  datos.append("archivo", imagen.archivo, imagen.nombre)
  datos.append("descripcion", imagen.descripcion)
  datos.append("compartida", String(imagen.compartida))
  try {
    const res = await fetch(`/api/informes/${informeId}/imagenes`, { method: "POST", body: datos })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { error: json?.error || "No se pudo subir la imagen." }
    return { imagen: json.imagen }
  } catch {
    return { error: "No se pudo subir la imagen. Verificá tu conexión." }
  }
}

// Botones para elegir archivo o sacar una foto (en el celular abre la cámara)
function SelectorImagenes({ onElegidas, disabled }: { onElegidas: (archivos: File[]) => void; disabled?: boolean }) {
  const galeria = useRef<HTMLInputElement>(null)
  const camara = useRef<HTMLInputElement>(null)
  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (archivos.length) onElegidas(archivos)
  }
  return (
    <div className="flex flex-wrap gap-2">
      <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={alElegir} />
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={alElegir} />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => galeria.current?.click()}
        className="border-dorado text-dorado hover:bg-primary/10">
        <ImagePlus className="mr-2 h-4 w-4" /> Agregar imagen
      </Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => camara.current?.click()}
        className="border-dorado text-dorado hover:bg-primary/10 sm:hidden">
        <Camera className="mr-2 h-4 w-4" /> Sacar foto
      </Button>
    </div>
  )
}

async function prepararVarias(archivos: File[], lugaresLibres: number) {
  if (archivos.length > lugaresLibres) {
    avisoError(`Cada nota admite hasta ${MAX_IMAGENES} imágenes.`)
    archivos = archivos.slice(0, Math.max(0, lugaresLibres))
  }
  const listas: { archivo: Blob; nombre: string }[] = []
  for (const archivo of archivos) {
    if (!archivo.type.startsWith("image/")) {
      avisoError(`"${archivo.name}" no es una imagen.`)
      continue
    }
    try {
      listas.push({ archivo: await prepararImagen(archivo), nombre: nombreJpg(archivo.name) })
    } catch {
      avisoError(`No se pudo leer "${archivo.name}". Probá con una imagen JPG o PNG.`)
    }
  }
  return listas
}

// Tarjeta de una imagen con su descripción y el interruptor de compartir
function TarjetaImagen({
  src,
  nombre,
  descripcion,
  compartida,
  ocupado,
  onDescripcion,
  onGuardarDescripcion,
  onCompartida,
  onBorrar,
  onAmpliar,
}: {
  src: string
  nombre: string
  descripcion: string
  compartida: boolean
  ocupado?: boolean
  onDescripcion: (texto: string) => void
  onGuardarDescripcion?: () => void
  onCompartida: (valor: boolean) => void
  // Solo antes de guardar la nota: una imagen guardada integra la historia clínica y no se borra
  onBorrar?: () => void
  onAmpliar: () => void
}) {
  return (
    <li className="overflow-hidden rounded-xl border border-borde bg-background">
      <button type="button" onClick={onAmpliar} className="block w-full bg-white" title="Ver en grande">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={descripcion || nombre} className="h-44 w-full object-contain" />
      </button>
      <div className="space-y-3 p-3">
        <Textarea
          value={descripcion}
          onChange={(e) => onDescripcion(e.target.value)}
          onBlur={onGuardarDescripcion}
          rows={2}
          maxLength={2000}
          placeholder="Descripción u observaciones (por ejemplo: «Persona bajo la lluvia», con paraguas y nubes)"
          className="bg-background text-sm text-foreground border-borde-fuerte focus:border-dorado"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-suave">
            <Switch checked={compartida} onCheckedChange={onCompartida} disabled={ocupado} />
            {compartida ? <Users className="h-4 w-4 text-exito" /> : <Lock className="h-4 w-4 text-tenue" />}
            {compartida ? "Compartida con el paciente" : "Solo para vos"}
          </label>
          {onBorrar ? (
            <Button type="button" variant="ghost" size="icon" disabled={ocupado} onClick={onBorrar}
              className="text-peligro hover:bg-red-500/10" title="Quitar imagen" aria-label="Quitar imagen">
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            ocupado && <Loader2 className="h-4 w-4 animate-spin text-dorado" />
          )}
        </div>
      </div>
    </li>
  )
}

function Ampliada({ src, titulo, onCerrar }: { src: string | null; titulo: string; onCerrar: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={(abierta) => !abierta && onCerrar()}>
      <DialogContent className="max-w-[min(64rem,calc(100vw-2rem))] p-3 sm:max-w-[min(64rem,calc(100vw-2rem))]">
        <DialogTitle className="pr-8 text-base text-foreground">{titulo}</DialogTitle>
        <DialogDescription className="sr-only">Imagen de la nota en tamaño grande</DialogDescription>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={titulo} className="max-h-[78vh] w-full rounded-md bg-white object-contain" />
        )}
      </DialogContent>
    </Dialog>
  )
}

const Ayuda = () => (
  <p className="text-sm text-tenue">
    Dibujos de técnicas proyectivas, fotos de producciones del paciente o material de apoyo. Se guardan cifradas.
    Las que marques como compartidas las ve el paciente en su informe de seguimiento. Al guardar la nota, las imágenes
    pasan a formar parte de la historia clínica y no se pueden borrar.
  </p>
)

// ---------- Alta de la nota: se suben después de guardarla ----------
export function ImagenesPendientes({
  value,
  onChange,
  disabled,
}: {
  value: ImagenPendiente[]
  onChange: (imagenes: ImagenPendiente[]) => void
  disabled?: boolean
}) {
  const [preparando, setPreparando] = useState(false)
  const [ampliada, setAmpliada] = useState<ImagenPendiente | null>(null)
  const actual = useRef(value)
  actual.current = value

  // Libera las vistas previas al salir de la página
  useEffect(() => () => actual.current.forEach((i) => URL.revokeObjectURL(i.vistaPrevia)), [])

  const agregar = async (archivos: File[]) => {
    setPreparando(true)
    const listas = await prepararVarias(archivos, MAX_IMAGENES - value.length)
    setPreparando(false)
    onChange([
      ...actual.current,
      ...listas.map((l) => ({
        clave: crypto.randomUUID(),
        archivo: l.archivo,
        nombre: l.nombre,
        vistaPrevia: URL.createObjectURL(l.archivo),
        descripcion: "",
        compartida: false,
      })),
    ])
  }
  const cambiar = (clave: string, cambios: Partial<ImagenPendiente>) =>
    onChange(value.map((i) => (i.clave === clave ? { ...i, ...cambios } : i)))
  const quitar = (imagen: ImagenPendiente) => {
    URL.revokeObjectURL(imagen.vistaPrevia)
    onChange(value.filter((i) => i.clave !== imagen.clave))
  }

  return (
    <div className="space-y-3">
      <Ayuda />
      {value.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {value.map((img) => (
            <TarjetaImagen
              key={img.clave}
              src={img.vistaPrevia}
              nombre={img.nombre}
              descripcion={img.descripcion}
              compartida={img.compartida}
              ocupado={disabled}
              onDescripcion={(descripcion) => cambiar(img.clave, { descripcion })}
              onCompartida={(compartida) => cambiar(img.clave, { compartida })}
              onBorrar={() => quitar(img)}
              onAmpliar={() => setAmpliada(img)}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <SelectorImagenes onElegidas={agregar} disabled={disabled || preparando || value.length >= MAX_IMAGENES} />
        {preparando && <Loader2 className="h-4 w-4 animate-spin text-dorado" />}
      </div>
      <Ampliada src={ampliada?.vistaPrevia ?? null} titulo={ampliada?.descripcion || ampliada?.nombre || ""} onCerrar={() => setAmpliada(null)} />
    </div>
  )
}

// ---------- Edición de la nota: cada cambio se guarda en el momento ----------
export function ImagenesNota({ informeId }: { informeId: string }) {
  const [imagenes, setImagenes] = useState<ImagenGuardada[]>([])
  const [descripciones, setDescripciones] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [ampliada, setAmpliada] = useState<ImagenGuardada | null>(null)

  useEffect(() => {
    fetch(`/api/informes/${informeId}/imagenes`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setImagenes(data.imagenes)
        setDescripciones(Object.fromEntries(data.imagenes.map((i: ImagenGuardada) => [i.id, i.descripcion ?? ""])))
      })
      .catch(() => avisoError("No se pudieron cargar las imágenes de la nota."))
      .finally(() => setCargando(false))
  }, [informeId])

  const agregar = async (archivos: File[]) => {
    setSubiendo(true)
    const listas = await prepararVarias(archivos, MAX_IMAGENES - imagenes.length)
    for (const l of listas) {
      const r = await subirImagen(informeId, { ...l, descripcion: "", compartida: false })
      if (r.error) avisoError(r.error)
      else if (r.imagen) {
        setImagenes((prev) => [...prev, r.imagen!])
        setDescripciones((prev) => ({ ...prev, [r.imagen!.id]: "" }))
      }
    }
    setSubiendo(false)
    if (listas.length) avisoExito(listas.length === 1 ? "Imagen agregada." : "Imágenes agregadas.")
  }

  const guardar = async (imagen: ImagenGuardada, cambios: { descripcion?: string; compartida?: boolean }) => {
    setOcupada(imagen.id)
    try {
      const res = await fetch(imagen.url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error)
      setImagenes((prev) => prev.map((i) => (i.id === imagen.id ? data.imagen : i)))
      if (cambios.compartida !== undefined) {
        avisoExito(cambios.compartida ? "El paciente va a ver esta imagen en su informe de seguimiento." : "La imagen ya no se comparte con el paciente.")
      }
    } catch (e) {
      avisoError((e as Error).message || "No se pudo guardar el cambio.")
    } finally {
      setOcupada(null)
    }
  }

  // Antes de subir: una vez guardada, la imagen integra la historia clínica y no se puede borrar
  const agregarConAviso = async (archivos: File[]) => {
    const aviso =
      "Una vez agregada, la imagen queda en la historia clínica y no se puede borrar (Ley 26.529). Después podés cambiar su descripción o dejar de compartirla. ¿Agregarla?"
    if (await confirmar(aviso, "Sí, agregar")) await agregar(archivos)
  }

  if (cargando) return <Loader2 className="h-5 w-5 animate-spin text-dorado" />

  return (
    <div className="space-y-3">
      <Ayuda />
      {imagenes.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {imagenes.map((img) => (
            <TarjetaImagen
              key={img.id}
              src={img.url}
              nombre={img.nombre}
              descripcion={descripciones[img.id] ?? ""}
              compartida={img.compartida}
              ocupado={ocupada === img.id}
              onDescripcion={(texto) => setDescripciones((prev) => ({ ...prev, [img.id]: texto }))}
              onGuardarDescripcion={() => {
                const texto = (descripciones[img.id] ?? "").trim()
                if (texto !== (img.descripcion ?? "")) guardar(img, { descripcion: texto })
              }}
              onCompartida={(compartida) => guardar(img, { compartida })}
              onAmpliar={() => setAmpliada(img)}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <SelectorImagenes onElegidas={agregarConAviso} disabled={subiendo || imagenes.length >= MAX_IMAGENES} />
        {subiendo && (
          <span className="flex items-center gap-2 text-sm text-tenue">
            <Loader2 className="h-4 w-4 animate-spin text-dorado" /> Subiendo...
          </span>
        )}
      </div>
      <Ampliada src={ampliada?.url ?? null} titulo={ampliada?.descripcion || ampliada?.nombre || ""} onCerrar={() => setAmpliada(null)} />
    </div>
  )
}

// ---------- Solo lectura ----------
export function GaleriaImagenes({
  informeId,
  titulo,
  mostrarPrivacidad = false,
  className,
}: {
  informeId: string
  titulo?: string
  mostrarPrivacidad?: boolean
  className?: string
}) {
  const [imagenes, setImagenes] = useState<ImagenGuardada[] | null>(null)
  const [ampliada, setAmpliada] = useState<ImagenGuardada | null>(null)

  useEffect(() => {
    fetch(`/api/informes/${informeId}/imagenes`)
      .then(async (res) => (res.ok ? (await res.json()).imagenes : []))
      .catch(() => [])
      .then(setImagenes)
  }, [informeId])

  if (!imagenes || imagenes.length === 0) return null

  return (
    <div className={className}>
      {titulo && <h3 className="mb-3 font-semibold text-foreground">{titulo}</h3>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {imagenes.map((img) => (
          <li key={img.id} className="overflow-hidden rounded-xl border border-borde bg-background">
            <button type="button" onClick={() => setAmpliada(img)} className="relative block w-full bg-white" title="Ver en grande">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.descripcion || img.nombre} className="h-36 w-full object-contain" />
              {mostrarPrivacidad && (
                <span className={cn(
                  "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  img.compartida ? "bg-emerald-700 text-white" : "bg-black/60 text-white",
                )}>
                  {img.compartida ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {img.compartida ? "Compartida" : "Privada"}
                </span>
              )}
            </button>
            {img.descripcion && <p className="whitespace-pre-wrap p-2 text-sm text-suave">{img.descripcion}</p>}
          </li>
        ))}
      </ul>
      <Ampliada src={ampliada?.url ?? null} titulo={ampliada?.descripcion || ampliada?.nombre || ""} onCerrar={() => setAmpliada(null)} />
    </div>
  )
}

