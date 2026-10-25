"use client"

import { useState, useEffect, useMemo, type ChangeEvent } from "react"
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from "next-auth/react"

import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TypographyP } from '@/components/ui/typography';
import { Menu, Loader2, X, Users, Calendar, FileText, LogOut, Shield, Edit3, UserCheck, UserX, MoreVertical, Search, AlertCircle, PlusCircle } from "lucide-react"

import { avisoExito, avisoError, confirmar } from "@/lib/avisos";



interface UserActionPermissions {
  canView: boolean
  canEdit: boolean
  canToggleStatus: boolean
  canRegister: boolean
}

// Interfaces para los datos de la API
interface UsuarioCompleto {
  id: string
  email: string
  activo: boolean
  ultimoAcceso: Date
  perfiles: { id: string; nombre: string; descripcion: string }[]
  persona: {
    id: string
    nombre: string
    apellido: string
    dni: string
    fechaNacimiento: Date
  } | null
  psicologo: {
    id: string
    especialidad: string
    numeroLicencia: string
  } | null
  paciente: {
    id: string
    obraSocial: {
      id: string
      nombre: string
      activo: boolean
    } | null
  } | null
}

// Qué puede hacer cada rol del sistema (RF 4.1 y RF 4.2). Los perfiles creados a mano muestran su descripción.
const FUNCIONES_POR_PERFIL: Record<string, string> = {
  Administrador: "Gestiona las cuentas de usuario y los perfiles, y ve la auditoría",
  "Psicólogo": "Atiende sus sesiones y escribe los informes clínicos",
  Recepcionista: "Maneja la agenda: turnos, pagos y profesionales",
  Auditor: "Consulta la auditoría, los usuarios, los perfiles y la agenda (solo lectura)",
  Paciente: "Ve sus turnos y el material que le comparte su psicólogo",
}

const COLOR_PERFIL: Record<string, string> = {
  Administrador: "border-aviso text-aviso",
  "Psicólogo": "border-info text-info",
  Recepcionista: "border-naranja text-naranja",
  Auditor: "border-borde-fuerte text-suave",
  Paciente: "border-exito text-exito",
}

export default function ListarUsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])

  const [userActionPermissions, setUserActionPermissions] = useState<UserActionPermissions>({
    canView: false,
    canEdit: false,
    canToggleStatus: false,
    canRegister: false,
  })

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    let canViewUsers = false
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)

      canViewUsers = userPermissions.includes("Ver Usuarios")
      setUserActionPermissions({
        canView: canViewUsers,
        canEdit: userPermissions.includes("Editar Usuario"),
        canToggleStatus: userPermissions.includes("Eliminar Usuario"), // Maps to toggle status
        canRegister: userPermissions.includes("Registrar Usuario"),
      })

      // Filter main modules for sidebar
      const filteredMainModules = MODULOS_DISPONIBLES.filter((module) =>
        module.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)

      if (!canViewUsers) {
        setError("No tenés permiso para ver la lista de usuarios.")
        setIsLoading(false)
      }
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setError("No se pudieron verificar los permisos del usuario.")
      setIsLoading(false)
    }

    if (canViewUsers) {
      fetchUsuarios()
    }
  }, [session, status, router])

  const fetchUsuarios = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: Fallo al obtener la lista de usuarios`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          /* Response was not JSON */
        }
        throw new Error(errorMessage)
      }

      const usuariosData: UsuarioCompleto[] = await response.json()
      setUsuarios(usuariosData)
    } catch (err: any) {
      console.error("Error al cargar usuarios:", err)
      setError(err.message || "Ocurrió un error al cargar los usuarios.")
      setUsuarios([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return usuarios
    const searchTermLower = searchTerm.toLowerCase()
    return usuarios.filter(
      (user) =>
        user.persona?.nombre.toLowerCase().includes(searchTermLower) ||
        user.persona?.apellido.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower) ||
        (user.perfiles ?? []).some((p) => p.nombre.toLowerCase().includes(searchTermLower)) ||
        user.persona?.dni.includes(searchTermLower) ||
        (user.psicologo?.especialidad && user.psicologo.especialidad.toLowerCase().includes(searchTermLower)) ||
        (user.psicologo?.numeroLicencia && user.psicologo.numeroLicencia.toLowerCase().includes(searchTermLower)) ||
        (user.paciente?.obraSocial?.nombre && user.paciente.obraSocial.nombre.toLowerCase().includes(searchTermLower)),
    )
  }, [usuarios, searchTerm])

  const handleEdit = (userId: string) => {
    router.push(`/usuarios/editar/${userId}`)
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!await confirmar(`¿Seguro que querés ${currentStatus ? "desactivar" : "activar"} este usuario?`)) return

    try {
      const response = await fetch(`/api/usuarios/${userId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !currentStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al cambiar el estado del usuario")
      }

      // Update local state to reflect change immediately
      setUsuarios((prevUsers) => prevUsers.map((u) => (u.id === userId ? { ...u, activo: !currentStatus } : u)))

      avisoExito(`Usuario ${!currentStatus ? "activado" : "desactivado"} correctamente.`)
    } catch (err: any) {
      avisoError(err.message || "No se pudo cambiar el estado del usuario.")
    }
  }

  const nombreDe = (user: UsuarioCompleto) =>
    user.persona ? `${user.persona.nombre} ${user.persona.apellido}` : "Sin datos personales"

  const perfilesDe = (user: UsuarioCompleto) => {
    if (user.perfiles?.length) return user.perfiles
    const deducidos: { id: string; nombre: string; descripcion: string }[] = []
    if (user.psicologo) deducidos.push({ id: "psicologo", nombre: "Psicólogo", descripcion: "" })
    if (user.paciente) deducidos.push({ id: "paciente", nombre: "Paciente", descripcion: "" })
    return deducidos
  }

  const funcionDe = (perfil: { nombre: string; descripcion: string }) =>
    FUNCIONES_POR_PERFIL[perfil.nombre] ?? perfil.descripcion

  const insigniasTipo = (user: UsuarioCompleto) => {
    const perfiles = perfilesDe(user)
    if (perfiles.length === 0) {
      return <Badge variant="outline" className="border-peligro text-peligro">Sin perfil</Badge>
    }
    return perfiles.map((perfil) => (
      <Badge
        key={perfil.id}
        variant="outline"
        title={funcionDe(perfil)}
        className={COLOR_PERFIL[perfil.nombre] ?? "border-borde-fuerte text-suave"}
      >
        {perfil.nombre}
      </Badge>
    ))
  }

  const funcionesDe = (user: UsuarioCompleto) =>
    perfilesDe(user)
      .map(funcionDe)
      .filter(Boolean)
      .map((texto) => (
        <p key={texto} className="text-sm text-tenue">
          {texto}
        </p>
      ))

  const insigniaEstado = (activo: boolean) => (
    <Badge style={{ backgroundColor: activo ? "#2E7D32" : "#C62828", color: "#ffffff" }}>
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  )

  const menuAcciones = (user: UsuarioCompleto) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 shrink-0 p-0 text-suave hover:text-foreground hover:bg-superficie">
          <span className="sr-only">Abrir menú</span>
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ backgroundColor: "var(--background)", borderColor: "var(--borde)" }}>
        {userActionPermissions.canEdit && (
          <DropdownMenuItem
            onClick={() => handleEdit(user.id)}
            className="text-suave hover:bg-superficie focus:bg-superficie focus:text-foreground"
          >
            <Edit3 className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
        )}
        {userActionPermissions.canToggleStatus && (
          <DropdownMenuItem
            onClick={() => handleToggleStatus(user.id, user.activo)}
            className={`text-suave hover:bg-superficie focus:bg-superficie focus:text-foreground ${
              user.activo ? "hover:!bg-red-700 focus:!bg-red-700" : "hover:!bg-green-700 focus:!bg-green-700"
            }`}
          >
            {user.activo ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
            {user.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        )}
        {!userActionPermissions.canEdit && !userActionPermissions.canToggleStatus && (
          <DropdownMenuItem disabled className="text-tenue">
            Sin acciones
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const handleLogout = async () => await cerrarSesion()
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }
  const navigateToRegister = () => router.push("/usuarios/registrar")

  const nombreCompleto = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  // Loading state for initial permission check
  if (status === "loading" && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-foreground text-lg">Cargando...</div>
      </div>
    )
  }

  // Access Denied or Error during permission check
  if (!userActionPermissions.canView && !isLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-peligro" />
          <h1 className="text-3xl font-bold text-peligro mb-4">Acceso Denegado</h1>
          <p className="text-suave mb-6">{error || "No tenés permiso para ver esta página."}</p>
          <Button onClick={() => router.push("/welcome")} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            Volver al Inicio
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <EncabezadoPagina titulo="Usuarios" volverA="/usuarios" textoVolver="Volver a Usuarios">
          {userActionPermissions.canRegister && (
            <Button
              onClick={navigateToRegister}
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              className="flex items-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> Registrar usuario
            </Button>
          )}
        </EncabezadoPagina>

        <div className="mb-6 flex items-center bg-background p-3 rounded-lg shadow">
          <Search className="text-tenue mr-3 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nombre, email, DNI, perfil, especialidad u obra social..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-foreground border-none focus:ring-0 placeholder-gray-400"
          />
        </div>

        {isLoading && userActionPermissions.canView ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: "var(--background)" }}>
            <Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" />
            <TypographyP className="text-foreground">Cargando...</TypographyP>
          </div>
        ) : error ? (
          <div className="text-center text-peligro py-10 bg-red-500/10 bg-opacity-30 p-4 rounded-md">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" /> {error}
          </div>
        ) : !filteredUsers.length ? (
          <div className="text-center text-tenue py-10 bg-background p-6 rounded-md">
            No se encontraron usuarios que coincidan con la búsqueda o no hay usuarios registrados.
          </div>
        ) : (
          <>
            {/* Celular y tablet: una tarjeta por usuario */}
            <ul className="space-y-3 lg:hidden">
              {filteredUsers.map((user) => (
                <li key={user.id} className="rounded-xl border border-borde p-4 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">{nombreDe(user)}</p>
                      <p className="break-all text-sm text-suave">{user.email}</p>
                    </div>
                    {menuAcciones(user)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {insigniasTipo(user)}
                    {insigniaEstado(user.activo)}
                  </div>
                  <div className="mt-2">{funcionesDe(user)}</div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-tenue">DNI</dt>
                    <dd className="text-texto-2">{user.persona?.dni || "—"}</dd>
                    {user.psicologo && (
                      <>
                        <dt className="text-tenue">Especialidad</dt>
                        <dd className="text-texto-2">{user.psicologo.especialidad || "—"}</dd>
                        <dt className="text-tenue">Licencia</dt>
                        <dd className="text-texto-2">{user.psicologo.numeroLicencia || "—"}</dd>
                      </>
                    )}
                    {user.paciente && (
                      <>
                        <dt className="text-tenue">Obra social</dt>
                        <dd className="text-texto-2">{user.paciente.obraSocial?.nombre || "Sin obra social"}</dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>

            {/* Computadora: tabla completa, sin desplazamiento lateral */}
            <div className="hidden rounded-xl border border-borde shadow lg:block" style={{ backgroundColor: "var(--card)" }}>
              <Table className="text-base">
                <TableHeader>
                  <TableRow className="border-b border-borde">
                    <TableHead className="px-4 py-3 text-foreground font-semibold">Usuario</TableHead>
                    <TableHead className="px-4 py-3 text-foreground font-semibold">DNI</TableHead>
                    <TableHead className="px-4 py-3 text-foreground font-semibold">Perfil y funciones</TableHead>
                    <TableHead className="px-4 py-3 text-foreground font-semibold">Especialidad / Obra social</TableHead>
                    <TableHead className="px-4 py-3 text-foreground font-semibold">Estado</TableHead>
                    <TableHead className="px-4 py-3 text-foreground font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-b border-borde hover:bg-background transition-colors">
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <p className="font-medium text-foreground">{nombreDe(user)}</p>
                        <p className="text-sm text-suave break-all">{user.email}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-suave">{user.persona?.dni || "—"}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal max-w-xs">
                        <div className="flex flex-wrap gap-1">{insigniasTipo(user)}</div>
                        <div className="mt-1">{funcionesDe(user)}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        {user.psicologo && (
                          <>
                            <p className="text-texto-2">{user.psicologo.especialidad || "—"}</p>
                            <p className="text-sm text-tenue">Licencia {user.psicologo.numeroLicencia || "—"}</p>
                          </>
                        )}
                        {user.paciente && (
                          <p className="text-texto-2">
                            {user.psicologo && <span className="text-sm text-tenue">Obra social: </span>}
                            {user.paciente.obraSocial?.nombre || "Sin obra social"}
                          </p>
                        )}
                        {!user.psicologo && !user.paciente && <span className="text-tenue">—</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3">{insigniaEstado(user.activo)}</TableCell>
                      <TableCell className="px-4 py-3 text-right">{menuAcciones(user)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
