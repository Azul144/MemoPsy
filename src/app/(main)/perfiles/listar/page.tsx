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
import { TypographyP } from '@/components/ui/typography';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Menu,
  X,
  Users,
  Calendar,
  FileText,
  LogOut,
  HomeIcon,
  Shield,
  Edit3,
  Trash2,
  MoreVertical,
  Search,
  AlertCircle,
  PlusCircle,
  Eye,
  User,
  Loader2,
} from "lucide-react"
import { avisoExito, avisoError, confirmar } from "@/lib/avisos";



interface PerfilActionPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canRegister: boolean
  canAssign: boolean
}

interface PermisoInfo {
  id: string
  nombre: string
  modulo: string
}

interface PerfilCompleto {
  id: string
  nombre: string
  descripcion: string
  fechaCreacion: Date
  permisos: PermisoInfo[]
  usuariosCount: number
}

export default function ListarPerfilesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [perfiles, setPerfiles] = useState<PerfilCompleto[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])

  const [perfilActionPermissions, setPerfilActionPermissions] = useState<PerfilActionPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canRegister: false,
    canAssign: false,
  })

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    let canViewPerfiles = false
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)

      canViewPerfiles = userPermissions.includes("Ver Perfiles")
      setPerfilActionPermissions({
        canView: canViewPerfiles,
        canEdit: userPermissions.includes("Editar Perfil"),
        canDelete: userPermissions.includes("Eliminar Perfil"),
        canRegister: userPermissions.includes("Registrar Perfil"),
        canAssign: userPermissions.includes("Asignar Perfil"),
      })

      const filteredMainModules = MODULOS_DISPONIBLES.filter((module) =>
        module.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)

      if (!canViewPerfiles) {
        setError("No tienes permiso para ver la lista de perfiles.")
        setIsLoading(false)
      }
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setError("No se pudieron verificar los permisos del usuario.")
      setIsLoading(false)
    }

    if (canViewPerfiles) {
      fetchPerfiles()
    }
  }, [session, status, router])

  const fetchPerfiles = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/perfiles")
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: Fallo al obtener la lista de perfiles`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          /* Response was not JSON */
        }
        throw new Error(errorMessage)
      }

      const perfilesData: PerfilCompleto[] = await response.json()
      setPerfiles(perfilesData)
    } catch (err: any) {
      console.error("Error al cargar perfiles:", err)
      setError(err.message || "Ocurrió un error al cargar los perfiles.")
      setPerfiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPerfiles = useMemo(() => {
    if (!searchTerm) return perfiles
    const searchTermLower = searchTerm.toLowerCase()
    return perfiles.filter(
      (perfil) =>
        perfil.nombre.toLowerCase().includes(searchTermLower) ||
        perfil.descripcion.toLowerCase().includes(searchTermLower) ||
        perfil.permisos.some(
          (permiso) =>
            permiso.nombre.toLowerCase().includes(searchTermLower) ||
            permiso.modulo.toLowerCase().includes(searchTermLower),
        ),
    )
  }, [perfiles, searchTerm])

  const handleEdit = (perfilId: string) => {
    router.push(`/perfiles/editar/${perfilId}`)
  }

  const handleAssign = (perfilId: string) => {
    router.push(`/perfiles/asignar/${perfilId}`)
  }

  const handleDelete = async (perfilId: string, perfilNombre: string) => {
    if (
      !await confirmar(`¿Estás seguro de que quieres eliminar el perfil "${perfilNombre}"? Esta acción no se puede deshacer.`)
    )
      return

    try {
      const response = await fetch(`/api/perfiles/${perfilId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al eliminar el perfil")
      }

      setPerfiles((prevPerfiles) => prevPerfiles.filter((p) => p.id !== perfilId))
      avisoExito(`Perfil "${perfilNombre}" eliminado correctamente.`)
    } catch (err: any) {
      avisoError(err.message || "No se pudo eliminar el perfil.")
    }
  }

  const handleLogout = async () => await cerrarSesion()
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }
  const navigateToRegister = () => router.push("/perfiles/registrar")

  const nombreCompleto = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  if (status === "loading" && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
                  <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
                  <TypographyP className="text-white">Cargando...</TypographyP>
      </div>
    )
  }

  if (!perfilActionPermissions.canView && !isLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">{error || "No tienes permiso para ver esta página."}</p>
          <Button onClick={() => router.push("/perfiles")} style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}>
            Volver a Perfiles
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Lista de Perfiles" descripcion="Gestiona los perfiles del sistema y sus permisos asociados" volverA="/perfiles" textoVolver="Volver a Perfiles">
          {perfilActionPermissions.canRegister && (
            <Button
              onClick={navigateToRegister}
              style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
              className="flex items-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> Registrar Nuevo Perfil
            </Button>
          )}
        </EncabezadoPagina>

        <div className="mb-6 flex items-center bg-[#152B2B] p-3 rounded-lg shadow">
          <Search className="text-gray-400 mr-3 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nombre, descripción o permisos..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white border-none focus:ring-0 placeholder-gray-400"
          />
        </div>

        {isLoading && perfilActionPermissions.canView ? (
          <div className="text-center text-gray-300 py-10">Cargando perfiles...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-10 bg-red-500/10 bg-opacity-30 p-4 rounded-md">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" /> {error}
          </div>
        ) : !filteredPerfiles.length ? (
          <div className="text-center text-gray-400 py-10 bg-[#152B2B] p-6 rounded-md">
            {searchTerm
              ? "No se encontraron perfiles que coincidan con la búsqueda."
              : "No hay perfiles registrados en el sistema."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow" style={{ backgroundColor: "#1D3434" }}>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700">
                  <TableHead className="text-white font-semibold">Nombre del Perfil</TableHead>
                  <TableHead className="text-white font-semibold">Descripción</TableHead>
                  <TableHead className="text-white font-semibold">Permisos por Módulo</TableHead>
                  <TableHead className="text-white font-semibold">Usuarios Asignados</TableHead>
                  <TableHead className="text-white font-semibold">Fecha de Creación</TableHead>
                  <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPerfiles.map((perfil) => {
                  const permisosPorModulo = perfil.permisos.reduce(
                    (acc, permiso) => {
                      if (!acc[permiso.modulo]) acc[permiso.modulo] = 0
                      acc[permiso.modulo]++
                      return acc
                    },
                    {} as Record<string, number>,
                  )

                  return (
                    <TableRow key={perfil.id} className="border-b border-gray-700 hover:bg-[#152B2B] transition-colors">
                      <TableCell className="text-gray-200 font-medium">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-teal-400" />
                          {perfil.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs">
                        <div className="truncate" title={perfil.descripcion}>
                          {perfil.descripcion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(permisosPorModulo).map(([modulo, count]) => (
                            <Badge key={modulo} variant="outline" className="text-xs border-teal-500 text-teal-300">
                              {modulo}: {count}
                            </Badge>
                          ))}
                          {Object.keys(permisosPorModulo).length === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Sin permisos
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {perfil.usuariosCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(perfil.fechaCreacion).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-[#2A4242]"
                            >
                              <span className="sr-only">Abrir menú</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            style={{ backgroundColor: "#152A2A", borderColor: "#2A4A4A" }}
                          >
                            {/*<DropdownMenuItem
                              onClick={() => router.push(`/perfiles/ver/${perfil.id}`)}
                              className="text-gray-300 hover:bg-[#2A4242] focus:bg-[#2A4242] focus:text-white"
                            >
                               <Eye className="mr-2 h-4 w-4" /> Ver Detalles 
                            </DropdownMenuItem>*/}
                            {perfilActionPermissions.canEdit && (
                              <DropdownMenuItem
                                onClick={() => handleEdit(perfil.id)}
                                className="text-gray-300 hover:bg-[#2A4242] focus:bg-[#2A4242] focus:text-white"
                              >
                                <Edit3 className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            {perfilActionPermissions.canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(perfil.id, perfil.nombre)}
                                className="text-gray-300 hover:!bg-red-700 focus:!bg-red-700 focus:text-white"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            )}
                            {!perfilActionPermissions.canEdit &&
                              !perfilActionPermissions.canDelete &&
                              !perfilActionPermissions.canAssign && (
                                <DropdownMenuItem disabled className="text-gray-500">
                                  Sin acciones disponibles
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}
