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
        setError("No tienes permiso para ver la lista de usuarios.")
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
    if (!await confirmar(`¿Estás seguro de que quieres ${currentStatus ? "desactivar" : "activar"} este usuario?`)) return

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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <div className="text-white text-lg">Cargando...</div>
      </div>
    )
  }

  // Access Denied or Error during permission check
  if (!userActionPermissions.canView && !isLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">{error || "No tienes permiso para ver esta página."}</p>
          <Button onClick={() => router.push("/welcome")} style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}>
            Volver al Inicio
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Lista de Usuarios" volverA="/usuarios" textoVolver="Volver a Usuarios">
          {userActionPermissions.canRegister && (
            <Button
              onClick={navigateToRegister}
              style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
              className="flex items-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> Registrar Nuevo Usuario
            </Button>
          )}
        </EncabezadoPagina>

        <div className="mb-6 flex items-center bg-[#152B2B] p-3 rounded-lg shadow">
          <Search className="text-gray-400 mr-3 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido, email, DNI, especialidad o obra social..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white border-none focus:ring-0 placeholder-gray-400"
          />
        </div>

        {isLoading && userActionPermissions.canView ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
            <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
            <TypographyP className="text-white">Cargando...</TypographyP>
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-10 bg-red-500/10 bg-opacity-30 p-4 rounded-md">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" /> {error}
          </div>
        ) : !filteredUsers.length ? (
          <div className="text-center text-gray-400 py-10 bg-[#152B2B] p-6 rounded-md">
            No se encontraron usuarios que coincidan con la búsqueda o no hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow" style={{ backgroundColor: "#1D3434" }}>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700">
                  <TableHead className="text-white font-semibold">Nombre Completo</TableHead>
                  <TableHead className="text-white font-semibold">Email</TableHead>
                  <TableHead className="text-white font-semibold">DNI</TableHead>
                  <TableHead className="text-white font-semibold">Tipo de Usuario</TableHead>
                  <TableHead className="text-white font-semibold">Especialidad</TableHead>
                  <TableHead className="text-white font-semibold">Nro. Licencia</TableHead>
                  <TableHead className="text-white font-semibold">Obra Social</TableHead>
                  <TableHead className="text-white font-semibold">Estado</TableHead>
                  <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const tiposUsuario = []
                  if (user.psicologo) tiposUsuario.push("Psicólogo")
                  if (user.paciente) tiposUsuario.push("Paciente")
                  if (tiposUsuario.length === 0) tiposUsuario.push("Usuario")

                  return (
                    <TableRow key={user.id} className="border-b border-gray-700 hover:bg-[#152B2B] transition-colors">
                      <TableCell className="text-gray-200">
                        {user.persona ? `${user.persona.nombre} ${user.persona.apellido}` : "Sin datos personales"}
                      </TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell className="text-gray-300">{user.persona?.dni || "N/A"}</TableCell>
                      <TableCell>
                        {tiposUsuario.map((tipo, index) => (
                          <Badge
                            key={tipo}
                            variant="outline"
                            className={`mr-1 mb-1 ${
                              tipo === "Psicólogo"
                                ? "border-teal-500 text-teal-300"
                                : tipo === "Paciente"
                                  ? "border-lime-500 text-lime-300"
                                  : "border-gray-500 text-gray-300"
                            }`}
                          >
                            {tipo}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-gray-300">{user.psicologo?.especialidad || "N/A"}</TableCell>
                      <TableCell className="text-gray-300">{user.psicologo?.numeroLicencia || "N/A"}</TableCell>
                      <TableCell className="text-gray-300">{user.paciente?.obraSocial?.nombre || "N/A"}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: user.activo ? "#2E7D32" : "#C62828", color: "white" }}>
                          {user.activo ? "Activo" : "Inactivo"}
                        </Badge>
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
                            {userActionPermissions.canEdit && (
                              <DropdownMenuItem
                                onClick={() => handleEdit(user.id)}
                                className="text-gray-300 hover:bg-[#2A4242] focus:bg-[#2A4242] focus:text-white"
                              >
                                <Edit3 className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            {userActionPermissions.canToggleStatus && (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user.id, user.activo)}
                                className={`text-gray-300 hover:bg-[#2A4242] focus:bg-[#2A4242] focus:text-white ${
                                  user.activo
                                    ? "hover:!bg-red-700 focus:!bg-red-700"
                                    : "hover:!bg-green-700 focus:!bg-green-700"
                                }`}
                              >
                                {user.activo ? (
                                  <UserX className="mr-2 h-4 w-4" />
                                ) : (
                                  <UserCheck className="mr-2 h-4 w-4" />
                                )}
                                {user.activo ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                            )}
                            {!userActionPermissions.canEdit && !userActionPermissions.canToggleStatus && (
                              <DropdownMenuItem disabled className="text-gray-500">
                                Sin acciones
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

/*'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Menu, X, Users, Calendar, FileText, LogOut, Settings, Shield,
  Edit3, UserCheck, UserX, MoreVertical, Search, AlertCircle, ListFilter, PlusCircle
} from 'lucide-react'; // Added Search, AlertCircle, ListFilter

// Define User type
interface ObraSocial {
  id: string; // Assuming string ID, adjust if number
  nombre: string;
}

interface PsicologoDetails {
  id: string; // Assuming string ID
  especialidad?: string;
  numeroLicencia?: string;
}

interface PacienteDetails {
  id: string; // Assuming string ID
  obraSocial?: ObraSocial | null;
}

interface Persona {
  id: string; // Assuming string ID
  nombre: string;
  apellido: string;
  dni: string;
  // fechaNacimiento?: string; // Not currently used in table but good for type completeness
}

interface Perfil {
  // id_perfil: number; // If needed
  nombre: string;
}

interface User {
  id: string; // This is id_usuario from backend
  email: string;
  activo: boolean;
  persona: Persona;
  perfiles?: Perfil[];
  psicologo?: PsicologoDetails | null;
  paciente?: PacienteDetails | null;
}



interface UserActionPermissions {
  canView: boolean;
  canEdit: boolean;
  canToggleStatus: boolean;
  canRegister: boolean;
}

export default function ListarUsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true); // True initially for permission check then for data fetch
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  
  const [userActionPermissions, setUserActionPermissions] = useState<UserActionPermissions>({
    canView: false, // Assumed false until permission is verified
    canEdit: false,
    canToggleStatus: false,
    canRegister: false,
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    let canViewUsers = false;
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);
      
      canViewUsers = userPermissions.includes('Ver Usuarios');
      setUserActionPermissions({
        canView: canViewUsers,
        canEdit: userPermissions.includes('Editar Usuario'),
        canToggleStatus: userPermissions.includes('Eliminar Usuario'), // Maps to toggle status
        canRegister: userPermissions.includes('Registrar Usuario'),
      });

      // Filter main modules for sidebar
      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermissions.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);
      
      if (!canViewUsers) {
        setError("No tienes permiso para ver la lista de usuarios.");
        setIsLoading(false);
      }
    } else if (status === 'authenticated' && !session?.user?.permisos) {
      setError("No se pudieron verificar los permisos del usuario.");
      setIsLoading(false); // Stop loading as we can't proceed
    }
    
    if (canViewUsers) {
      fetchUsers();
    }

  }, [session, status, router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    // **Simulated API Response for GET /api/usuarios (as per Step 2 of prompt):**
    // This interface will represent the raw data from GET /api/usuarios
    // Worker Action: Define and document the exact JSON structure of the first 1-2 objects.
    // Example:
    // [
    //   {
    //     "id_usuario_api": "user-uuid-001",
    //     "email_usuario": "juan.perez@example.com",
    //     "esta_activo_usr": true,
    //     "datos_personales": { // This is one way persona might be nested
    //       "id_persona_api": "persona-uuid-101",
    //       "nombre_persona": "Juan",
    //       "apellido_persona": "Perez",
    //       "dni_persona": "12345678"
    //     },
    //     "perfiles_del_usuario": [ { "nombre_perfil": "Administrador" } ],
    //     "psicologo_foreign_key": "psico-uuid-201", 
    //     "paciente_foreign_key": null 
    //   },
    //   // ... more users
    // ]
    interface SimulatedRawPersona {
      id_persona_api: string;
      nombre_persona: string;
      apellido_persona: string;
      dni_persona: string;
    }
    interface SimulatedRawPerfil {
      nombre_perfil: string;
    }
    interface RawUserFromApi { // Renaming from BaseUserFromSimulatedAPI for clarity in this step
      id_usuario_api: string;
      email_usuario: string;
      esta_activo_usr: boolean;
      datos_personales?: SimulatedRawPersona | null; // For nested persona
      id_persona_fk?: string | null; // For flat persona ID (alternative)
      perfiles_del_usuario?: SimulatedRawPerfil[] | null;
      psicologo_foreign_key?: string | null;
      paciente_foreign_key?: string | null;
    }

    // Interface for the raw simulated response from GET /api/usuarios
    interface SimulatedRawPersona {
      id_persona_api: string;
      nombre_persona: string;
      apellido_persona: string;
      dni_persona: string;
    }
    interface SimulatedRawPerfil {
      nombre_perfil: string;
    }
    interface RawUserFromApi {
      id_usuario_api: string;
      email_usuario: string;
      esta_activo_usr: boolean;
      datos_personales?: SimulatedRawPersona | null;
      id_persona_fk?: string | null; 
      perfiles_del_usuario?: SimulatedRawPerfil[] | null;
      psicologo_foreign_key?: string | null;
      paciente_foreign_key?: string | null;
    }

    // Interface for the raw simulated response from GET /api/psicologos/{id}
    interface RawPsicologoData {
        id_psicologo_pk: string;
        especialidad_ps: string;
        licencia_nro: string;
    }

    async function getPsicologoDetails(psicologoId: string): Promise<PsicologoDetails | null> {
      try {
        // console.log(`Fetching psicologo details for ID: ${psicologoId}`); // For actual debugging
        const response = await fetch(`/api/psicologos/${psicologoId}`);
        if (!response.ok) {
          console.error(`Error fetching psicologo ${psicologoId}: ${response.status} ${response.statusText}`);
          return null;
        }
        const data: RawPsicologoData = await response.json();
        return { 
            id: data.id_psicologo_pk || psicologoId, 
            especialidad: data.especialidad_ps, 
            numeroLicencia: data.licencia_nro 
        };
      } catch (e) {
        console.error(`Failed to fetch or parse psicologo details for ${psicologoId}`, e);
        return null;
      }
    }

    // Interface for the raw simulated response from GET /api/pacientes/{id}
    interface RawObraSocialInfo {
        os_id: string;
        os_nombre: string;
    }
    interface RawPacienteData {
        id_paciente_pk: string;
        obra_social_info?: RawObraSocialInfo | null; 
    }

    async function getPacienteDetails(pacienteId: string): Promise<PacienteDetails | null> {
      try {
        // console.log(`Fetching paciente details for ID: ${pacienteId}`); // For actual debugging
        const response = await fetch(`/api/pacientes/${pacienteId}`);
        if (!response.ok) {
          console.error(`Error fetching paciente ${pacienteId}: ${response.status} ${response.statusText}`);
          return null;
        }
        const data: RawPacienteData = await response.json();
        
        let obraSocialData: ObraSocial | null = null;
        if (data.obra_social_info) { 
            obraSocialData = { id: data.obra_social_info.os_id, nombre: data.obra_social_info.os_nombre };
        } 
        // **Report Point (Obra Social Name):** The simulated Paciente API response *does* include obra social name via `obra_social_info.os_nombre`.
        // No tertiary call is needed based on this simulation.
        
        return { 
            id: data.id_paciente_pk || pacienteId, 
            obraSocial: obraSocialData 
        };
      } catch (e) {
        console.error(`Failed to fetch or parse paciente details for ${pacienteId}`, e);
        return null;
      }
    }

    try {
      const baseUsersResponse = await fetch('/api/usuarios');
      if (!baseUsersResponse.ok) {
        let errorMessage = `Error ${baseUsersResponse.status}: Fallo al obtener la lista base de usuarios`;
        try {
          const errorData = await baseUsersResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) { /* Response was not JSON  }
        throw new Error(errorMessage);
      }
      const rawDataFromApiArray: RawUserFromApi[] = await baseUsersResponse.json();

      if (!rawDataFromApiArray || rawDataFromApiArray.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }
      
      const userDetailPromises = rawDataFromApiArray.map(async (apiUser: RawUserFromApi) => {
        const personaData: Persona = apiUser.datos_personales 
          ? {
              id: apiUser.datos_personales.id_persona_api,
              nombre: apiUser.datos_personales.nombre_persona,
              apellido: apiUser.datos_personales.apellido_persona,
              dni: apiUser.datos_personales.dni_persona
            }
          : { 
              id: apiUser.id_persona_fk || `unknown-persona-${apiUser.id_usuario_api}`,
              nombre: 'N/A', 
              apellido: '(Falta Persona)', 
              dni: 'N/A'
            };
        
        let psicologoData: PsicologoDetails | null = null;
        if (apiUser.psicologo_foreign_key) {
          // **Worker Action Report (Step 1):** Using `apiUser.psicologo_foreign_key` to call `getPsicologoDetails`.
          psicologoData = await getPsicologoDetails(apiUser.psicologo_foreign_key);
        }

        let pacienteData: PacienteDetails | null = null;
        if (apiUser.paciente_foreign_key) {
          // **Worker Action Report (Step 1):** Using `apiUser.paciente_foreign_key` to call `getPacienteDetails`.
          pacienteData = await getPacienteDetails(apiUser.paciente_foreign_key);
        }

        return {
          id: apiUser.id_usuario_api,
          email: apiUser.email_usuario,
          activo: apiUser.esta_activo_usr,
          persona: personaData,
          perfiles: apiUser.perfiles_del_usuario?.map((p: SimulatedRawPerfil) => ({ nombre: p.nombre_perfil })) || [],
          psicologo: psicologoData,
          paciente: pacienteData,
        } as User; 
      });

      const enrichedUsers = await Promise.all(userDetailPromises);
      setUsers(enrichedUsers);

    } catch (err: any) {
      console.error("Error in fetchUsers process:", err);
      setError(err.message || 'Ocurrió un error al cargar los datos completos de los usuarios.');
      setUsers([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const searchTermLower = searchTerm.toLowerCase();
    return users.filter(user =>
      user.persona.nombre.toLowerCase().includes(searchTermLower) ||
      user.persona.apellido.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower) ||
      user.persona.dni.includes(searchTermLower) || // DNI search can be exact or partial
      (user.psicologo?.especialidad && user.psicologo.especialidad.toLowerCase().includes(searchTermLower)) ||
      (user.psicologo?.numeroLicencia && user.psicologo.numeroLicencia.toLowerCase().includes(searchTermLower)) ||
      (user.paciente?.obraSocial?.nombre && user.paciente.obraSocial.nombre.toLowerCase().includes(searchTermLower))
    );
  }, [users, searchTerm]);

  const handleEdit = (userId: string) => {
    router.push(`/usuarios/editar/${userId}`); // This route needs to be created
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    // Optional: Add a confirmation dialog here
    // if (!confirm(`¿Estás seguro de que quieres ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) return;

    try {
      const response = await fetch(`/api/usuarios/${userId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !currentStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar el estado del usuario');
      }
      // Update local state to reflect change immediately
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, activo: !currentStatus } : u
      ));
      // TODO: Show success toast
      alert(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (err: any) {
      // TODO: Show error toast
      alert(err.message || 'No se pudo cambiar el estado del usuario.');
    }
  };
  
  const handleLogout = async () => await cerrarSesion();
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => {
    router.push(ruta);
    setIsMenuOpen(false);
  };
  const navigateToRegister = () => router.push('/usuarios/registrar');


  const nombreCompleto = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || 'Usuario';

  // Loading state for initial permission check
  if (status === 'loading' && isLoading) {
     return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }
  
  // Access Denied or Error during permission check
  if (!userActionPermissions.canView && !isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#152A2A' }}>
        <nav className="w-full p-4" style={{ backgroundColor: '#1D3434' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4"><div className="w-10 h-10"><MemopsyLogo /></div><h1 className="text-xl font-bold" style={{ color: '#F1C77A' }}>MemoPsy</h1></div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">{error || "No tienes permiso para ver esta página."}</p>
          <Button onClick={() => router.push('/welcome')} style={{ backgroundColor: '#F1C77A', color: '#1D3434' }}>
            Volver al Inicio
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#152A2A' }}>
      {/* Navigation Bar *}
      <nav className="w-full p-4" style={{ backgroundColor: '#1D3434' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4"><div className="w-10 h-10"><MemopsyLogo /></div><h1 className="text-xl font-bold" style={{ color: '#F1C77A' }}>MemoPsy</h1></div>
          <button onClick={toggleMenu} className="p-2 rounded-lg" style={{ backgroundColor: '#152A2A' }}>{isMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}</button>
        </div>
        {isMenuOpen && (
          <div className="absolute top-16 right-4 w-64 rounded-lg shadow-lg z-50" style={{ backgroundColor: '#1D3434' }}>
            <div className="p-4 border-b border-gray-600"><p className="text-sm text-gray-300">Conectado como:</p><p className="font-semibold text-white">{session?.user?.email}</p><p className="text-sm" style={{ color: '#F1C77A' }}>{nombreCompleto}</p></div>
            <div className="p-2"><h3 className="px-2 py-1 text-sm font-semibold text-gray-300 uppercase tracking-wide">Módulos</h3>
              {modulosPermitidos.map(m => <button key={m.id} onClick={() => navigateToModule(m.ruta)} className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors" style={{backgroundColor: 'transparent'}} onMouseEnter={e=>(e.target as HTMLElement).style.backgroundColor='#152A2A'} onMouseLeave={e=>(e.target as HTMLElement).style.backgroundColor='transparent'}><m.icon className="w-5 h-5 mr-3" /> {m.nombre}</button>)}</div>
            <div className="p-2 border-t border-gray-600"><button onClick={() => router.push('/settings')} className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors" style={{backgroundColor: 'transparent'}} onMouseEnter={e=>(e.target as HTMLElement).style.backgroundColor='#152A2A'} onMouseLeave={e=>(e.target as HTMLElement).style.backgroundColor='transparent'}><Settings className="w-5 h-5 mr-3" /> Configuración</button><button onClick={handleLogout} className="w-full flex items-center px-2 py-2 text-left text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors"><LogOut className="w-5 h-5 mr-3" /> Cerrar Sesión</button></div>
          </div>
        )}
      </nav>

      {/* Main Content *}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#F1C77A' }}>Lista de Usuarios</h1>
          {userActionPermissions.canRegister && (
            <Button onClick={navigateToRegister} style={{ backgroundColor: '#F1C77A', color: '#1D3434' }} className="flex items-center">
              <PlusCircle className="w-5 h-5 mr-2" /> Registrar Nuevo Usuario
            </Button>
          )}
        </div>
        
        <div className="mb-6 flex items-center bg-gray-800 p-3 rounded-lg shadow">
            <Search className="text-gray-400 mr-3 w-5 h-5" />
            <Input
                type="text"
                placeholder="Buscar por nombre, apellido, email o DNI..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:ring-0 placeholder-gray-400"
            />
            {/* <Button variant="outline" className="ml-3 text-gray-300 border-gray-600 hover:bg-gray-700">
                <ListFilter className="w-5 h-5 mr-2" /> Filtros
            </Button> *}
        </div>

        {isLoading && userActionPermissions.canView ? (
          <div className="text-center text-gray-300 py-10">Cargando usuarios...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-10 bg-red-900 bg-opacity-30 p-4 rounded-md">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" /> {error}
          </div>
        ) : !filteredUsers.length ? (
          <div className="text-center text-gray-400 py-10 bg-gray-800 p-6 rounded-md">
            No se encontraron usuarios que coincidan con la búsqueda o no hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow" style={{backgroundColor: '#1D3434'}}>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700 hover:bg-gray-700_">
                  <TableHead className="text-white font-semibold">Nombre Completo</TableHead>
                  <TableHead className="text-white font-semibold">Email</TableHead>
                  <TableHead className="text-white font-semibold">DNI</TableHead>
                  <TableHead className="text-white font-semibold">Roles/Perfiles</TableHead>
                  <TableHead className="text-white font-semibold">Especialidad</TableHead>
                  <TableHead className="text-white font-semibold">Nro. Licencia</TableHead>
                  <TableHead className="text-white font-semibold">Obra Social</TableHead>
                  <TableHead className="text-white font-semibold">Estado</TableHead>
                  <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => ( 
                  <TableRow key={user.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                    <TableCell className="text-gray-200">{user.persona.nombre} {user.persona.apellido}</TableCell>
                    <TableCell className="text-gray-300">{user.email}</TableCell>
                    <TableCell className="text-gray-300">{user.persona.dni}</TableCell>
                    <TableCell>
                      {user.perfiles && user.perfiles.length > 0
                        ? user.perfiles.map(p => <Badge key={p.nombre} variant="outline" className="mr-1 mb-1 border-teal-500 text-teal-300">{p.nombre}</Badge>) 
                        : <Badge variant="secondary">Sin perfil</Badge>}
                    </TableCell>
                    <TableCell className="text-gray-300">{user.psicologo?.especialidad || 'N/A'}</TableCell>
                    <TableCell className="text-gray-300">{user.psicologo?.numeroLicencia || 'N/A'}</TableCell>
                    <TableCell className="text-gray-300">{user.paciente?.obraSocial?.nombre || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: user.activo ? '#2E7D32' : '#C62828', color: 'white' }}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700">
                            <span className="sr-only">Abrir menú</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" style={{backgroundColor: '#152A2A', borderColor: '#2A4A4A'}}>
                          {userActionPermissions.canEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(user.id)} className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700 focus:text-white">
                              <Edit3 className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {userActionPermissions.canToggleStatus && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.activo)} className={`text-gray-300 hover:bg-gray-700 focus:bg-gray-700 focus:text-white ${user.activo ? 'hover:!bg-red-700 focus:!bg-red-700' : 'hover:!bg-green-700 focus:!bg-green-700'}`}>
                              {user.activo ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                              {user.activo ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                          )}
                           {!userActionPermissions.canEdit && !userActionPermissions.canToggleStatus && (
                             <DropdownMenuItem disabled className="text-gray-500">Sin acciones</DropdownMenuItem>
                           )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
*/