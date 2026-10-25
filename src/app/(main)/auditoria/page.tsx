"use client"
// RF 1.4 - Registro de auditoría: quién ingresó, quién modificó datos sensibles y cuándo.
// Pantalla de SOLO LECTURA para el Auditor y el Administrador (RF 4.2).

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertCircle, ChevronLeft, ChevronRight, Eye, Filter, Loader2, XCircle } from "lucide-react"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Evento {
  id: string
  fecha: string
  usuarioId: number | null
  email: string | null
  accion: string
  modulo: string
  entidadId: string | null
  detalle: string | null
  ip: string | null
}

interface Filtros {
  usuario: string
  modulo: string
  accion: string
  desde: string
  hasta: string
}

const FILTROS_VACIOS: Filtros = { usuario: "", modulo: "", accion: "", desde: "", hasta: "" }
const TODOS = "__todos__"

// Las acciones se guardan como códigos; acá se muestran en palabras
const NOMBRE_ACCION: Record<string, string> = {
  LOGIN_OK: "Ingreso",
  LOGIN_FALLIDO: "Ingreso fallido",
  LOGOUT: "Cierre de sesión",
  CREAR: "Alta",
  EDITAR: "Edición",
  ELIMINAR: "Baja",
  VER: "Consulta",
  EXPORTAR_PDF: "Descarga en PDF",
  CAMBIAR_ESTADO: "Cambio de estado",
  REGISTRAR_PAGO: "Registro de pago",
  ASIGNAR_PERFIL: "Asignación de perfil",
  CAMBIAR_CONTRASENA: "Cambio de contraseña",
  RESTABLECER_CONTRASENA: "Restablecer contraseña",
  ACTIVAR_2FA: "Activó verificación en dos pasos",
  DESACTIVAR_2FA: "Desactivó verificación en dos pasos",
  CONFIGURAR_2FA: "Verificación en dos pasos",
  ACCESO_DENEGADO: "Acceso denegado",
  ESTRUCTURAR_IA: "Nota ordenada con IA",
  REPROGRAMAR: "Reprogramación de turno",
  RESPONDER_ACTIVIDAD: "Respuesta a actividad",
}

const MOTIVO_LOGIN: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos",
  CUENTA_BLOQUEADA: "Cuenta bloqueada por intentos fallidos",
  CUENTA_INACTIVA: "Cuenta desactivada",
  CODIGO_INVALIDO: "Código de verificación incorrecto",
  ERROR_INTERNO: "Error interno",
}

const nombreAccion = (accion: string) => NOMBRE_ACCION[accion] ?? accion
const textoDetalle = (e: Evento) =>
  e.accion === "LOGIN_FALLIDO" ? (MOTIVO_LOGIN[e.detalle ?? ""] ?? e.detalle) : e.detalle

function colorAccion(accion: string) {
  if (accion === "LOGIN_FALLIDO" || accion === "ACCESO_DENEGADO") return "border-red-500 text-peligro"
  if (accion === "ELIMINAR") return "border-orange-400 text-naranja"
  if (accion === "CREAR") return "border-emerald-500 text-exito"
  if (accion === "LOGIN_OK" || accion === "LOGOUT") return "border-sky-500 text-info"
  if (accion === "VER") return "border-borde-fuerte text-suave"
  return "border-amber-400 text-aviso"
}

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [opciones, setOpciones] = useState<{ modulos: string[]; acciones: string[] }>({ modulos: [], acciones: [] })
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS) // lo que se está escribiendo
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS) // lo que está aplicado
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    Object.entries(filtros).forEach(([clave, valor]) => valor && params.set(clave, valor))
    try {
      const res = await fetch(`/api/auditoria?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el registro de auditoría")
      setEventos(data.data)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setOpciones(data.opciones)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el registro de auditoría")
      setEventos([])
    } finally {
      setCargando(false)
    }
  }, [page, filtros])

  useEffect(() => {
    cargar()
  }, [cargar])

  const aplicar = () => {
    setPage(1)
    setFiltros(borrador)
  }
  const limpiar = () => {
    setPage(1)
    setBorrador(FILTROS_VACIOS)
    setFiltros(FILTROS_VACIOS)
  }
  const hayFiltros = Object.values(filtros).some(Boolean)

  const campo = "bg-background text-foreground border-borde-fuerte"

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <EncabezadoPagina
          titulo="Registro de auditoría"
          descripcion="Ingresos al sistema y cambios sobre datos sensibles: quién, qué, sobre qué registro y cuándo. Nunca se muestra contenido clínico."
        >
          <Badge variant="outline" className="border-sky-500 px-3 py-1 text-info">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Solo lectura
          </Badge>
        </EncabezadoPagina>

        {/* Filtros */}
        <div className="mb-6 rounded-2xl border border-foreground/10 bg-background p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="aud-usuario" className="text-suave">Usuario (email)</Label>
              <Input
                id="aud-usuario"
                value={borrador.usuario}
                onChange={(e) => setBorrador({ ...borrador, usuario: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && aplicar()}
                placeholder="Ej: psicologa@..."
                className={campo}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-suave">Módulo</Label>
              <Select
                value={borrador.modulo || TODOS}
                onValueChange={(v) => setBorrador({ ...borrador, modulo: v === TODOS ? "" : v })}
              >
                <SelectTrigger className={cn(campo, "w-full")}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card text-foreground border-borde-fuerte">
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {opciones.modulos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-suave">Acción</Label>
              <Select
                value={borrador.accion || TODOS}
                onValueChange={(v) => setBorrador({ ...borrador, accion: v === TODOS ? "" : v })}
              >
                <SelectTrigger className={cn(campo, "w-full")}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card text-foreground border-borde-fuerte">
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  {opciones.acciones.map((a) => <SelectItem key={a} value={a}>{nombreAccion(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-desde" className="text-suave">Desde</Label>
              <Input id="aud-desde" type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} className={campo} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-hasta" className="text-suave">Hasta</Label>
              <Input id="aud-hasta" type="date" value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} className={campo} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button onClick={aplicar} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                <Filter className="mr-2 h-4 w-4" /> Filtrar
              </Button>
              {hayFiltros && (
                <Button variant="outline" onClick={limpiar} className="border-red-500 text-peligro hover:bg-red-500 hover:text-[#ffffff]">
                  <XCircle className="mr-2 h-4 w-4" /> Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mb-3 text-sm text-suave">{total} evento(s) registrado(s)</p>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-12 text-suave">
            <Loader2 className="h-5 w-5 animate-spin text-dorado" /> Cargando registro...
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-500/10 p-6 text-center text-peligro">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" /> {error}
          </div>
        ) : eventos.length === 0 ? (
          <div className="rounded-md bg-background p-8 text-center text-tenue">
            {hayFiltros ? "No hay eventos que coincidan con los filtros." : "Todavía no hay eventos registrados."}
          </div>
        ) : (
          <>
            {/* Celular y tablet: una tarjeta por evento */}
            <ul className="space-y-3 lg:hidden">
              {eventos.map((e) => (
                <li key={e.id} className="rounded-xl border border-borde p-4 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className={cn("text-xs", colorAccion(e.accion))}>
                      {nombreAccion(e.accion)}
                    </Badge>
                    <span className="text-sm text-tenue">
                      {format(new Date(e.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-texto-2">{e.email ?? "Sin usuario"}</p>
                  {textoDetalle(e) && <p className="mt-1 text-sm text-suave">{textoDetalle(e)}</p>}
                  <p className="mt-2 text-xs text-tenue">
                    {e.modulo}
                    {e.entidadId ? ` · registro #${e.entidadId}` : ""}
                    {e.ip ? ` · IP ${e.ip}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            {/* Computadora: tabla completa, sin desplazamiento lateral */}
            <div className="hidden rounded-xl border border-borde shadow lg:block" style={{ backgroundColor: "var(--card)" }}>
              <Table className="text-base">
                <TableHeader>
                  <TableRow className="border-b border-borde">
                    <TableHead className="px-4 py-3 font-semibold text-foreground">Fecha y hora</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-foreground">Usuario</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-foreground">Acción</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-foreground">Detalle</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-foreground">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((e) => (
                    <TableRow key={e.id} className="border-b border-borde hover:bg-background">
                      <TableCell className="px-4 py-3 text-suave">
                        <p>{format(new Date(e.fecha), "dd/MM/yyyy", { locale: es })}</p>
                        <p className="text-sm text-tenue">{format(new Date(e.fecha), "HH:mm:ss", { locale: es })}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal break-all text-texto-2">
                        {e.email ?? <span className="text-tenue">—</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs", colorAccion(e.accion))}>
                          {nombreAccion(e.accion)}
                        </Badge>
                        <p className="mt-1 text-sm text-tenue">{e.modulo}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal text-suave">
                        {textoDetalle(e) ?? <span className="text-tenue">—</span>}
                        {e.entidadId && <p className="text-sm text-tenue">Registro #{e.entidadId}</p>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-tenue">{e.ip ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!cargando && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-suave">Página {page} de {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
