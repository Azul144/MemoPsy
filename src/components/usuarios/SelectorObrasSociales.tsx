// src/components/usuarios/SelectorObrasSociales.tsx
// RF 1.1 - Casillas para marcar con qué obras sociales trabaja un psicólogo.
// Se usa al registrar y al editar un psicólogo. Se puede no marcar ninguna y completarlo después.
"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ObraSocialOpcion {
  id: string
  nombre: string
}

const esParticular = (nombre: string) => nombre.trim().toLowerCase() === "particular"

export default function SelectorObrasSociales({
  seleccionadas,
  onChange,
  error,
}: {
  seleccionadas: string[]
  // Acepta una lista o una función sobre la lista anterior (como el setter de useState)
  onChange: (ids: string[] | ((previas: string[]) => string[])) => void
  error?: string
}) {
  const [opciones, setOpciones] = useState<ObraSocialOpcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/obras-sociales")
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((datos: { id: string | number; nombre: string }[]) =>
        setOpciones(datos.map((o) => ({ id: String(o.id), nombre: o.nombre }))),
      )
      .catch(() => setErrorCarga("No se pudieron cargar las obras sociales."))
      .finally(() => setCargando(false))
  }, [])

  function alternar(id: string, marcada: boolean) {
    onChange((previas) => (marcada ? [...previas.filter((s) => s !== id), id] : previas.filter((s) => s !== id)))
  }

  const todas = opciones.length > 0 && opciones.every((o) => seleccionadas.includes(o.id))

  return (
    <div role="group" aria-labelledby="titulo-obras-sociales" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id="titulo-obras-sociales" className="text-sm font-medium text-suave">Obras sociales con las que trabaja</p>
        {opciones.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(todas ? [] : opciones.map((o) => o.id))}
            className="text-sm text-dorado hover:underline"
          >
            {todas ? "Quitar todas" : "Marcar todas"}
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-sm text-tenue">Cargando obras sociales...</p>
      ) : errorCarga ? (
        <p className="text-sm text-peligro">{errorCarga}</p>
      ) : (
        <div className="grid gap-x-4 gap-y-2.5 rounded-xl border border-borde-fuerte bg-superficie p-3 sm:grid-cols-2">
          {opciones.map((o) => {
            const idCampo = `obra-social-${o.id}`
            return (
              <div key={o.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={idCampo}
                  checked={seleccionadas.includes(o.id)}
                  onCheckedChange={(marcada) => alternar(o.id, Boolean(marcada))}
                  className="border-borde-fuerte"
                />
                <Label htmlFor={idCampo} className="cursor-pointer text-sm font-normal text-texto-2">
                  {esParticular(o.nombre) ? "Particular (sin obra social)" : o.nombre}
                </Label>
              </div>
            )
          })}
        </div>
      )}

      {error ? (
        <p className="text-sm text-peligro">{error}</p>
      ) : (
        <p className="text-sm text-tenue">
          Opcional. {seleccionadas.length === 0 ? "Podés completarlo después." : `${seleccionadas.length} elegida${seleccionadas.length === 1 ? "" : "s"}.`}
        </p>
      )}
    </div>
  )
}
