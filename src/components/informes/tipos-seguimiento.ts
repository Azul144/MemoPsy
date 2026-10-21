// RF 2.4 - Forma del informe de seguimiento tal como lo devuelve la API (lo usan las pantallas)

export type RespuestaActividad = "HECHA" | "NO_PUDE"

export interface ActividadSeguimiento {
  id: string
  descripcion: string
  respuesta: RespuestaActividad | null
  comentario: string | null
  fechaRespuesta: string | null
}

export interface Seguimiento {
  id: string
  informeId: string
  fechaSesion: string
  psicologo: string | null
  pacientes: string[]
  resumen: string
  pautas: string | null
  avances: string | null
  proximaSesion: string | null
  fechaCreacion: string
  fechaActualizacion: string
  actividades: ActividadSeguimiento[]
}

// Descarga el PDF del informe (se genera en el servidor en el momento; no queda guardado)
export async function descargarPdfSeguimiento(seguimientoId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/seguimientos/${seguimientoId}/pdf`)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return data?.error || "No se pudo generar el PDF."
    }
    const url = URL.createObjectURL(await res.blob())
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = `informe-seguimiento-${seguimientoId}.pdf`
    enlace.click()
    URL.revokeObjectURL(url)
    return null
  } catch {
    return "No se pudo descargar el PDF. Verificá tu conexión."
  }
}
