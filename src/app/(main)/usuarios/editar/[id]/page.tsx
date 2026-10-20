"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useSession, signOut } from "next-auth/react"
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter, useParams } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Menu,
  X,
  Users,
  Calendar,
  FileText,
  LogOut,
  HomeIcon,
  Shield,
  Brain,
  Activity,
  AlertCircle,
} from "lucide-react"
import { ObraSocial } from "@/models/obra-social.model"
import { ESPECIALIDADES_PSICOLOGIA } from "@/lib/especialidades"
import { avisoExito } from "@/lib/avisos";

// Interfaces
interface Perfil {
  id: string
  nombre: string
  descripcion?: string
}

//interface ObraSocial {
//  id: string
//  nombre: string
//  activo: boolean
//}

interface PersonaDetails {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
}

interface UsuarioDetails {
  id: string
  email: string
  activo: boolean
  persona: PersonaDetails
  psicologo?: {
    id: string
    especialidad: string
    numeroLicencia: string
  }
  paciente?: {
    id: string
    obraSocial: {
      id: string
      nombre: string
    }
  }
  perfiles: Perfil[]
}

interface UserFormData {
  email: string
  activo: boolean
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  numeroLicencia: string
  especialidad: string
}

interface ModuloConfig {
  id: string
  nombre: string
  descripcion: string
  icon: any
  ruta: string
  permisosRequeridos: string[]
}

const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Gestión de usuarios",
    icon: Users,
    ruta: "/usuarios",
    permisosRequeridos: ["Ver Usuarios", "Registrar Usuario", "Editar Usuario", "Eliminar Usuario"],
  },
  {
    id: "sesiones",
    nombre: "Sesiones",
    descripcion: "Administración de sesiones",
    icon: Calendar,
    ruta: "/sesiones",
    permisosRequeridos: ["Ver Sesiones", "Registrar Sesión", "Editar Sesión", "Eliminar Sesión", "Asignar Profesional"],
  },
  {
    id: "perfiles",
    nombre: "Perfiles",
    descripcion: "Administración de perfiles",
    icon: Shield,
    ruta: "/perfiles",
    permisosRequeridos: ["Ver Perfiles", "Registrar Perfil", "Editar Perfil", "Eliminar Perfil", "Asignar Perfil"],
  },
  {
    id: "informes",
    nombre: "Informes",
    descripcion: "Generación de reportes",
    icon: FileText,
    ruta: "/informes",
    permisosRequeridos: ["Ver Informes", "Registrar Informe", "Editar Informe", "Eliminar Informe"],
  },
]

interface FieldErrors {
  email?: string
  nombre?: string
  apellido?: string
  dni?: string
  fechaNacimiento?: string
  numeroLicencia?: string
  especialidad?: string
  selectedObraSocialId?: string
  general?: string
}

export default function EditarUsuarioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    activo: true,
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    numeroLicencia: "",
    especialidad: "",
  })

  const [isPsicologo, setIsPsicologo] = useState(false)
  const [isPaciente, setIsPaciente] = useState(false)

  // State for Obras Sociales
  const [obrasSocialesList, setObrasSocialesList] = useState<ObraSocial[]>([])
  const [selectedObraSocialId, setSelectedObraSocialId] = useState<string | null>(null)
  const [isLoadingObrasSociales, setIsLoadingObrasSociales] = useState(false)

  // State for Profiles
  const [availableProfiles, setAvailableProfiles] = useState<Perfil[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])
  const [userActionPermissions, setUserActionPermissions] = useState({ canEdit: false })

  const [hasExistingPsicologoData, setHasExistingPsicologoData] = useState(false)
  const [hasExistingPacienteData, setHasExistingPacienteData] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)
      const canEditUsers = userPermissions.includes("Editar Usuario")
      setUserActionPermissions({ canEdit: canEditUsers })

      if (!canEditUsers) {
        setError("No tienes permiso para editar usuarios.")
        setIsLoadingData(false)
      }

      const filteredMainModules = MODULOS_DISPONIBLES.filter((m) =>
        m.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setError("No se pudieron verificar los permisos.")
      setIsLoadingData(false)
    }
  }, [session, status, router])

  useEffect(() => {
    if (!userId || !userActionPermissions.canEdit) {
      if (!userId && status === "authenticated") {
        setError("No se proporcionó ID de usuario.")
        setIsLoadingData(false)
      }
      return
    }

    async function fetchUserData() {
      try {
        setIsLoadingData(true)
        setError(null)

        // Fetch obras sociales PRIMERO
        const obrasSocialesResponse = await fetch("/api/obras-sociales")
        if (obrasSocialesResponse.ok) {
          const obrasSocialesData = await obrasSocialesResponse.json()
          setObrasSocialesList(obrasSocialesData)
          console.log("DEBUG - Obras sociales cargadas:", obrasSocialesData)
        }

        // Fetch user data
        const userResponse = await fetch(`/api/usuarios/${userId}`)
        if (!userResponse.ok) {
          throw new Error(`Error ${userResponse.status}: No se pudo cargar el usuario.`)
        }
        const userData: UsuarioDetails = await userResponse.json()

        // Determine user type
        setIsPsicologo(!!userData.psicologo)
        setIsPaciente(!!userData.paciente)

        setFormData({
          email: userData.email,
          activo: userData.activo,
          nombre: userData.persona.nombre,
          apellido: userData.persona.apellido,
          dni: userData.persona.dni,
          fechaNacimiento: userData.persona.fechaNacimiento ? userData.persona.fechaNacimiento.split("T")[0] : "",
          numeroLicencia: userData.psicologo?.numeroLicencia || "",
          especialidad: userData.psicologo?.especialidad || "",
        })

        if (userData.paciente?.obraSocial) {
          setSelectedObraSocialId(userData.paciente.obraSocial.id.toString())
        }

        // Set current profiles
        setSelectedProfileIds(userData.perfiles.map((p) => p.id))

        // Determine if user has existing data that cannot be removed
        setHasExistingPsicologoData(!!userData.psicologo)
        setHasExistingPacienteData(!!userData.paciente)
      } catch (err: any) {
        console.error("Error fetching user data:", err)
        setError(err.message || "Error al cargar datos del usuario.")
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchUserData()

    // Fetch available profiles
    setIsLoadingProfiles(true)
    fetch("/api/perfiles")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los perfiles.")
        return res.json()
      })
      .then((data) => setAvailableProfiles(data))
      .catch((err) => {
        console.error("Error fetching profiles:", err)
        setError((prev) => (prev ? `${prev}\n${err.message}` : err.message))
      })
      .finally(() => setIsLoadingProfiles(false))

    // Fetch obras sociales
    fetch("/api/obras-sociales")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las obras sociales.")
        return res.json()
      })
      .then((data) => {
                // Convertir a modelos de dominio
                const obrasSociales = data.map((item: any) =>
                  ObraSocial.fromEntity({
                    id: item.id?.toString(),
                    nombre: item.nombre,
                    activo: item.activo !== undefined ? item.activo : true,
                  }),
                )
                setObrasSocialesList(obrasSociales)
       })
      .catch((err) => console.error("Error fetching obras sociales:", err))
  }, [userId, userActionPermissions.canEdit, status])

  useEffect(() => {
    console.log("DEBUG - selectedObraSocialId:", selectedObraSocialId);
    console.log("DEBUG - obrasSocialesList:", obrasSocialesList);
    console.log("DEBUG - obra encontrada:", obrasSocialesList.find(obra => obra.id === selectedObraSocialId));
  }, [selectedObraSocialId, obrasSocialesList]);

  const handleProfileSelectionChange = (profileId: string, isSelected: boolean) => {
    setSelectedProfileIds((prevSelectedIds) => {
      if (isSelected) {
        return [...prevSelectedIds, profileId]
      } else {
        return prevSelectedIds.filter((id) => id !== profileId)
      }
    })
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handlePsicologoToggle = (checked: boolean) => {
    setIsPsicologo(checked)
    if (!checked) {
      setFormData((prev) => ({ ...prev, numeroLicencia: "", especialidad: "" }))
      setFieldErrors((prev) => ({ ...prev, numeroLicencia: undefined, especialidad: undefined }))
    }
  }

  const handlePacienteToggle = (checked: boolean) => {
    setIsPaciente(checked)
    if (!checked) {
      setSelectedObraSocialId(null)
      setFieldErrors((prev) => ({ ...prev, selectedObraSocialId: undefined }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, activo: checked }))
  }

  const handleEspecialidadChange = (value: string) => {
    setFormData((prev) => ({ ...prev, especialidad: value }))
    if (fieldErrors.especialidad) {
      setFieldErrors((prev) => ({ ...prev, especialidad: undefined }))
    }
  }

  const handleObraSocialSelectChange = (value: string) => {
    setSelectedObraSocialId(value)
    if (fieldErrors.selectedObraSocialId) {
      setFieldErrors((prev) => ({ ...prev, selectedObraSocialId: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido."
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres."
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es requerido."
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = "El apellido debe tener al menos 2 caracteres."
    }

    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es requerido."
    } else if (!/^\d{7,8}$/.test(formData.dni.trim())) {
      newErrors.dni = "DNI inválido. Debe contener entre 7 y 8 dígitos numéricos."
    }

    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = "La fecha de nacimiento es requerida."
    } else {
      const birthDate = new Date(formData.fechaNacimiento)
      const today = new Date()
      if (birthDate > today) {
        newErrors.fechaNacimiento = "La fecha de nacimiento no puede ser futura."
      }
    }

    if (isPsicologo) {
      if (!formData.numeroLicencia?.trim()) {
        newErrors.numeroLicencia = "El número de licencia es requerido para psicólogos."
      } else if (formData.numeroLicencia.trim().length < 3) {
        newErrors.numeroLicencia = "El número de licencia debe tener al menos 3 caracteres."
      }
      if (!formData.especialidad?.trim()) {
        newErrors.especialidad = "La especialidad es requerida para psicólogos."
      } else if (formData.especialidad.trim().length < 3) {
        newErrors.especialidad = "La especialidad debe tener al menos 3 caracteres."
      }
    }

    if (isPaciente) {
      if (!selectedObraSocialId) {
        newErrors.selectedObraSocialId = "La Obra Social es requerida para pacientes."
      }
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    const userDataPayload: any = {
      email: formData.email,
      activo: formData.activo,
      persona: {
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        fechaNacimiento: formData.fechaNacimiento,
      },
      roles: {
        isPsicologo,
        isPaciente,
      },
      perfiles: selectedProfileIds,
    }

    if (isPsicologo) {
      userDataPayload.psicologo = {
        especialidad: formData.especialidad,
        numeroLicencia: formData.numeroLicencia,
      }
    }

    if (isPaciente) {
      userDataPayload.paciente = {
        idObraSocial: selectedObraSocialId,
      }
    }

    try {
      const response = await fetch(`/api/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userDataPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al actualizar el usuario.")
      }

      avisoExito("Usuario actualizado correctamente.")
      router.push("/usuarios/listar")
    } catch (err: any) {
      console.error("Error during user update:", err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => await cerrarSesion()
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }

  const pageTitle = formData.nombre ? `Editar Usuario: ${formData.nombre} ${formData.apellido}` : "Editar Usuario"
  const currentUserName = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  if (isLoadingData && status !== "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <div className="text-white text-lg">Cargando datos del usuario...</div>
      </div>
    )
  }

  if (!userActionPermissions.canEdit && !isLoadingData) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">{error || "No tienes permiso para editar este usuario."}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
          >
            Volver a la Lista
          </Button>
        </main>
      </div>
    )
  }

  if (error && !isLoadingData && !formData.nombre) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error al Cargar Usuario</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
          >
            Volver a la Lista
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo={<>{pageTitle}</>} descripcion="Actualice los datos del usuario y asigne perfiles según sea necesario." volverA="/usuarios" textoVolver="Volver a Usuarios" />
        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "#1D3434", borderColor: "#2A4A4A" }}>
          <CardContent>
            {isLoadingData && userActionPermissions.canEdit ? (
              <div className="text-center text-gray-300 py-10">Cargando datos del usuario...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre" className="text-gray-200">
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="bg-[#2A4242] mt-1"
                    />
                    {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
                  </div>
                  <div>
                    <Label htmlFor="apellido" className="text-gray-200">
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="bg-[#2A4242] mt-1"
                    />
                    {fieldErrors.apellido && <p className="text-red-500 text-xs mt-1">{fieldErrors.apellido}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dni" className="text-gray-200">
                      DNI
                    </Label>
                    <Input
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="bg-[#2A4242] mt-1"
                    />
                    {fieldErrors.dni && <p className="text-red-500 text-xs mt-1">{fieldErrors.dni}</p>}
                  </div>
                  <div>
                    <Label htmlFor="fechaNacimiento" className="text-gray-200">
                      Fecha de Nacimiento
                    </Label>
                    <Input
                      id="fechaNacimiento"
                      name="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={handleChange}
                      className="bg-[#2A4242] mt-1"
                      style={{ colorScheme: "dark" }}
                    />
                    {fieldErrors.fechaNacimiento && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.fechaNacimiento}</p>
                    )}
                  </div>
                </div>

                {/* Account Info */}
                <div>
                  <Label htmlFor="email" className="text-gray-200">
                    Email (No editable)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="bg-[#152B2B] mt-1 text-gray-400"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={handleSwitchChange}
                    className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-[#2B4243]"
                  />
                  <Label htmlFor="activo" className="text-gray-200">
                    Usuario {formData.activo ? "Activo" : "Inactivo"}
                  </Label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPsicologo"
                      checked={isPsicologo}
                      onCheckedChange={handlePsicologoToggle}
                      disabled={hasExistingPsicologoData}
                      className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-[#2B4243] disabled:opacity-50"
                    />
                    <Label htmlFor="isPsicologo" className="text-gray-200 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-teal-400" /> Psicólogo
                      {hasExistingPsicologoData && (
                        <span className="text-xs text-yellow-400 ml-2">
                          (No se puede desactivar - datos existentes)
                        </span>
                      )}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaciente"
                      checked={isPaciente}
                      onCheckedChange={handlePacienteToggle}
                      disabled={hasExistingPacienteData}
                      className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-[#2B4243] disabled:opacity-50"
                    />
                    <Label htmlFor="isPaciente" className="text-gray-200 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-lime-400" /> Paciente
                      {hasExistingPacienteData && (
                        <span className="text-xs text-yellow-400 ml-2">
                          (No se puede desactivar - datos existentes)
                        </span>
                      )}
                    </Label>
                  </div>
                </div>

                {isPsicologo && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="numeroLicencia" className="text-gray-200">
                        Número de Licencia
                      </Label>
                      <Input
                        id="numeroLicencia"
                        name="numeroLicencia"
                        value={formData.numeroLicencia}
                        onChange={handleChange}
                        className="bg-[#2A4242] mt-1"
                      />
                      {fieldErrors.numeroLicencia && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.numeroLicencia}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="especialidad" className="text-gray-200">
                        Especialidad
                      </Label>
                      <Select
                        name="especialidad"
                        value={formData.especialidad}
                        onValueChange={handleEspecialidadChange}
                      >
                        <SelectTrigger id="especialidad" className="bg-[#2A4242] border-gray-600 text-gray-200 mt-1">
                          <SelectValue placeholder="Seleccione una especialidad" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#152B2B] border-gray-600">
                          {/* Si el psicólogo tiene cargada una especialidad que no está en la lista, se conserva */}
                          {[
                            ...(formData.especialidad &&
                            !(ESPECIALIDADES_PSICOLOGIA as readonly string[]).includes(formData.especialidad)
                              ? [formData.especialidad]
                              : []),
                            ...ESPECIALIDADES_PSICOLOGIA,
                          ].map((esp) => (
                            <SelectItem
                              key={esp}
                              value={esp}
                              className="text-gray-200 cursor-pointer hover:!bg-teal-700/60 hover:!text-amber-200 focus:!bg-teal-700/60 focus:!text-amber-200 data-[state=checked]:!text-amber-300"
                            >
                              {esp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.especialidad && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.especialidad}</p>
                      )}
                    </div>
                  </div>
                )}

                {isPaciente && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="selectedObraSocialId" className="text-gray-200">
                        Obra Social
                      </Label>
                      <Select 
                        name="selectedObraSocialId" 
                        value={selectedObraSocialId || ""} 
                        onValueChange={handleObraSocialSelectChange}
                      >
                        <SelectTrigger className="bg-[#2A4242] border-gray-600 text-gray-200 mt-1">
                          <SelectValue 
                            placeholder={isLoadingObrasSociales ? "Cargando..." : "Seleccione Obra Social"}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-[#152B2B] border-gray-600">
                          {obrasSocialesList.length === 0 ? (
                            <SelectItem value="no-options" disabled className="text-gray-400">
                              No hay obras sociales disponibles
                            </SelectItem>
                          ) : (
                            obrasSocialesList.map((obra) => (
                              <SelectItem
                                key={obra.id}
                                value={obra.id}
                                className="text-gray-200 cursor-pointer hover:!bg-teal-700/60 hover:!text-amber-200 focus:!bg-teal-700/60 focus:!text-amber-200 data-[state=checked]:!text-amber-300"
                              >
                                {obra.nombre.trim().toLowerCase() === "particular"
                                  ? "Particular (sin obra social)"
                                  : obra.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {obrasSocialesList.find((o) => o.id === selectedObraSocialId)?.nombre.trim().toLowerCase() === "particular" && (
                        <p className="text-amber-300 text-xs mt-1">
                          Paciente particular: abona la sesión en efectivo o por QR del psicólogo.
                        </p>
                      )}
                      {fieldErrors.selectedObraSocialId && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.selectedObraSocialId}</p>
                      )}
                    </div>
                  </div>
                )}
                {/* Profile Selection */}
                <div className="space-y-2">
                  <Label className="text-gray-200">Perfiles de Usuario</Label>
                  {isLoadingProfiles ? (
                    <p className="text-gray-400">Cargando perfiles...</p>
                  ) : availableProfiles.length === 0 ? (
                    <p className="text-gray-400">No hay perfiles disponibles.</p>
                  ) : (
                    <div className="space-y-2 rounded-md border border-gray-700 p-4 max-h-60 overflow-y-auto">
                      {availableProfiles.map((perfil) => (
                        <div key={perfil.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perfil-${perfil.id}`}
                            checked={selectedProfileIds.includes(perfil.id)}
                            onCheckedChange={(checked) => handleProfileSelectionChange(perfil.id, !!checked)}
                            className="data-[state=checked]:bg-primary !text-primary-foreground border-gray-600"
                          />
                          <Label htmlFor={`perfil-${perfil.id}`} className="text-gray-300 font-normal">
                            {perfil.nombre}
                            {perfil.descripcion && (
                              <span className="text-xs text-gray-400 ml-2">({perfil.descripcion})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p className="text-red-500 text-sm text-center bg-red-500/10 bg-opacity-30 p-3 rounded-md">{error}</p>
                )}

                <CardFooter className="flex justify-end pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/usuarios/listar")}
                    className="mr-3 text-gray-300 border-gray-600 hover:bg-[#2A4242]"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary !text-primary-foreground hover:bg-primary/90 text-white">
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

/*
"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Menu,
  X,
  Users,
  Calendar,
  FileText,
  LogOut,
  HomeIcon,
  Shield,
  Brain,
  Activity,
  AlertCircle,
} from "lucide-react"

// Interfaces
interface Perfil {
  id: string
  nombre: string
  descripcion?: string
}

interface ObraSocial {
  id: string
  nombre: string
  activo: boolean
}

interface PersonaDetails {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
}

interface UsuarioDetails {
  id: string
  email: string
  activo: boolean
  persona: PersonaDetails
  psicologo?: {
    id: string
    especialidad: string
    numeroLicencia: string
  }
  paciente?: {
    id: string
    obraSocial: {
      id: string
      nombre: string
    }
  }
  perfiles: Perfil[]
}

interface UserFormData {
  email: string
  activo: boolean
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  numeroLicencia: string
  especialidad: string
}

interface ModuloConfig {
  id: string
  nombre: string
  descripcion: string
  icon: any
  ruta: string
  permisosRequeridos: string[]
}

const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Gestión de usuarios",
    icon: Users,
    ruta: "/usuarios",
    permisosRequeridos: ["Ver Usuarios", "Registrar Usuario", "Editar Usuario", "Eliminar Usuario"],
  },
  {
    id: "sesiones",
    nombre: "Sesiones",
    descripcion: "Administración de sesiones",
    icon: Calendar,
    ruta: "/sesiones",
    permisosRequeridos: ["Ver Sesiones", "Registrar Sesión", "Editar Sesión", "Eliminar Sesión", "Asignar Profesional"],
  },
  {
    id: "perfiles",
    nombre: "Perfiles",
    descripcion: "Administración de perfiles",
    icon: Shield,
    ruta: "/perfiles",
    permisosRequeridos: ["Ver Perfiles", "Registrar Perfil", "Editar Perfil", "Eliminar Perfil", "Asignar Perfil"],
  },
  {
    id: "informes",
    nombre: "Informes",
    descripcion: "Generación de reportes",
    icon: FileText,
    ruta: "/informes",
    permisosRequeridos: ["Ver Informes", "Registrar Informe", "Editar Informe", "Eliminar Informe"],
  },
]

interface FieldErrors {
  email?: string
  nombre?: string
  apellido?: string
  dni?: string
  fechaNacimiento?: string
  numeroLicencia?: string
  especialidad?: string
  selectedObraSocialId?: string
  general?: string
}

export default function EditarUsuarioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    activo: true,
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    numeroLicencia: "",
    especialidad: "",
  })

  const [isPsicologo, setIsPsicologo] = useState(false)
  const [isPaciente, setIsPaciente] = useState(false)

  // State for Obras Sociales
  const [obrasSocialesList, setObrasSocialesList] = useState<ObraSocial[]>([])
  const [selectedObraSocialId, setSelectedObraSocialId] = useState<string | null>(null)
  const [isLoadingObrasSociales, setIsLoadingObrasSociales] = useState(false)

  // State for Profiles
  const [availableProfiles, setAvailableProfiles] = useState<Perfil[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])
  const [userActionPermissions, setUserActionPermissions] = useState({ canEdit: false })

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)
      const canEditUsers = userPermissions.includes("Editar Usuario")
      setUserActionPermissions({ canEdit: canEditUsers })

      if (!canEditUsers) {
        setError("No tienes permiso para editar usuarios.")
        setIsLoadingData(false)
      }

      const filteredMainModules = MODULOS_DISPONIBLES.filter((m) =>
        m.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setError("No se pudieron verificar los permisos.")
      setIsLoadingData(false)
    }
  }, [session, status, router])

  useEffect(() => {
    if (!userId || !userActionPermissions.canEdit) {
      if (!userId && status === "authenticated") {
        setError("No se proporcionó ID de usuario.")
        setIsLoadingData(false)
      }
      return
    }

    async function fetchUserData() {
      try {
        setIsLoadingData(true)
        setError(null)

        // Fetch user data
        const userResponse = await fetch(`/api/usuarios/${userId}`)
        if (!userResponse.ok) {
          throw new Error(`Error ${userResponse.status}: No se pudo cargar el usuario.`)
        }
        const userData: UsuarioDetails = await userResponse.json()

        // Determine user type
        setIsPsicologo(!!userData.psicologo)
        setIsPaciente(!!userData.paciente)

        setFormData({
          email: userData.email,
          activo: userData.activo,
          nombre: userData.persona.nombre,
          apellido: userData.persona.apellido,
          dni: userData.persona.dni,
          fechaNacimiento: userData.persona.fechaNacimiento ? userData.persona.fechaNacimiento.split("T")[0] : "",
          numeroLicencia: userData.psicologo?.numeroLicencia || "",
          especialidad: userData.psicologo?.especialidad || "",
        })

        if (userData.paciente?.obraSocial) {
          setSelectedObraSocialId(userData.paciente.obraSocial.id)
        }

        // Set current profiles
        setSelectedProfileIds(userData.perfiles.map((p) => p.id))
      } catch (err: any) {
        console.error("Error fetching user data:", err)
        setError(err.message || "Error al cargar datos del usuario.")
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchUserData()

    // Fetch available profiles
    setIsLoadingProfiles(true)
    fetch("/api/perfiles")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los perfiles.")
        return res.json()
      })
      .then((data) => setAvailableProfiles(data))
      .catch((err) => {
        console.error("Error fetching profiles:", err)
        setError((prev) => (prev ? `${prev}\n${err.message}` : err.message))
      })
      .finally(() => setIsLoadingProfiles(false))

    // Fetch obras sociales
    fetch("/api/obras-sociales/editar")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las obras sociales.")
        return res.json()
      })
      .then((data) => setObrasSocialesList(data))
      .catch((err) => console.error("Error fetching obras sociales:", err))
  }, [userId, userActionPermissions.canEdit, status])

  const handleProfileSelectionChange = (profileId: string, isSelected: boolean) => {
    setSelectedProfileIds((prevSelectedIds) => {
      if (isSelected) {
        return [...prevSelectedIds, profileId]
      } else {
        return prevSelectedIds.filter((id) => id !== profileId)
      }
    })
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handlePsicologoToggle = (checked: boolean) => {
    setIsPsicologo(checked)
    if (!checked) {
      setFormData((prev) => ({ ...prev, numeroLicencia: "", especialidad: "" }))
      setFieldErrors((prev) => ({ ...prev, numeroLicencia: undefined, especialidad: undefined }))
    }
  }

  const handlePacienteToggle = (checked: boolean) => {
    setIsPaciente(checked)
    if (!checked) {
      setSelectedObraSocialId(null)
      setFieldErrors((prev) => ({ ...prev, selectedObraSocialId: undefined }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, activo: checked }))
  }

  const handleEspecialidadChange = (value: string) => {
    setFormData((prev) => ({ ...prev, especialidad: value }))
    if (fieldErrors.especialidad) {
      setFieldErrors((prev) => ({ ...prev, especialidad: undefined }))
    }
  }

  const handleObraSocialSelectChange = (value: string) => {
    setSelectedObraSocialId(value)
    if (fieldErrors.selectedObraSocialId) {
      setFieldErrors((prev) => ({ ...prev, selectedObraSocialId: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido."
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres."
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es requerido."
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = "El apellido debe tener al menos 2 caracteres."
    }

    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es requerido."
    } else if (!/^\d{7,8}$/.test(formData.dni.trim())) {
      newErrors.dni = "DNI inválido. Debe contener entre 7 y 8 dígitos numéricos."
    }

    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = "La fecha de nacimiento es requerida."
    } else {
      const birthDate = new Date(formData.fechaNacimiento)
      const today = new Date()
      if (birthDate > today) {
        newErrors.fechaNacimiento = "La fecha de nacimiento no puede ser futura."
      }
    }

    if (isPsicologo) {
      if (!formData.numeroLicencia?.trim()) {
        newErrors.numeroLicencia = "El número de licencia es requerido para psicólogos."
      } else if (formData.numeroLicencia.trim().length < 3) {
        newErrors.numeroLicencia = "El número de licencia debe tener al menos 3 caracteres."
      }
      if (!formData.especialidad?.trim()) {
        newErrors.especialidad = "La especialidad es requerida para psicólogos."
      } else if (formData.especialidad.trim().length < 3) {
        newErrors.especialidad = "La especialidad debe tener al menos 3 caracteres."
      }
    }

    if (isPaciente) {
      if (!selectedObraSocialId) {
        newErrors.selectedObraSocialId = "La Obra Social es requerida para pacientes."
      }
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    const userDataPayload: any = {
      email: formData.email,
      activo: formData.activo,
      persona: {
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        fechaNacimiento: formData.fechaNacimiento,
      },
      roles: {
        isPsicologo,
        isPaciente,
      },
      perfiles: selectedProfileIds,
    }

    if (isPsicologo) {
      userDataPayload.psicologo = {
        especialidad: formData.especialidad,
        numeroLicencia: formData.numeroLicencia,
      }
    }

    if (isPaciente) {
      userDataPayload.paciente = {
        idObraSocial: selectedObraSocialId,
      }
    }

    try {
      const response = await fetch(`/api/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userDataPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al actualizar el usuario.")
      }

      alert("Usuario actualizado exitosamente!")
      router.push("/usuarios/listar")
    } catch (err: any) {
      console.error("Error during user update:", err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => await cerrarSesion()
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }

  const pageTitle = formData.nombre ? `Editar Usuario: ${formData.nombre} ${formData.apellido}` : "Editar Usuario"
  const currentUserName = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  if (isLoadingData && status !== "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <div className="text-white text-lg">Cargando datos del usuario...</div>
      </div>
    )
  }

  if (!userActionPermissions.canEdit && !isLoadingData) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <nav className="w-full p-4" style={{ backgroundColor: "#1D3434" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10">
                <MemopsyLogo />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "#F1C77A" }}>
                MemoPsy
              </h1>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">{error || "No tienes permiso para editar este usuario."}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
          >
            Volver a la Lista
          </Button>
        </main>
      </div>
    )
  }

  if (error && !isLoadingData && !formData.nombre) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <nav className="w-full p-4" style={{ backgroundColor: "#1D3434" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10">
                <MemopsyLogo />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "#F1C77A" }}>
                MemoPsy
              </h1>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error al Cargar Usuario</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
          >
            Volver a la Lista
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#152A2A" }}>
      {/* Navigation Bar *}
      <nav className="w-full p-4" style={{ backgroundColor: "#1D3434" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10">
              <MemopsyLogo />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "#F1C77A" }}>
              MemoPsy
            </h1>
          </div>
          <button onClick={toggleMenu} className="p-2 rounded-lg" style={{ backgroundColor: "#152A2A" }}>
            {isMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
        {isMenuOpen && (
          <div
            className="absolute top-16 right-4 w-64 rounded-lg shadow-lg z-50"
            style={{ backgroundColor: "#1D3434" }}
          >
            <div className="p-4 border-b border-gray-600">
              <p className="text-sm text-gray-300">Conectado como:</p>
              <p className="font-semibold text-white">{session?.user?.email}</p>
              <p className="text-sm" style={{ color: "#F1C77A" }}>
                {currentUserName}
              </p>
            </div>
            <div className="p-2">
              <h3 className="px-2 py-1 text-sm font-semibold text-gray-300 uppercase tracking-wide">Módulos</h3>
              {modulosPermitidos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigateToModule(m.ruta)}
                  className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "#152A2A")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "transparent")}
                >
                  <m.icon className="w-5 h-5 mr-3" /> {m.nombre}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-gray-600">
              <button
                onClick={() => router.push("/welcome")}
                className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "#152A2A")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "transparent")}
              >
                <HomeIcon className="w-5 h-5 mr-3" />
                Home
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-2 py-2 text-left text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content *}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "#1D3434", borderColor: "#2A4A4A" }}>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold" style={{ color: "#F1C77A" }}>
              {pageTitle}
            </CardTitle>
            <CardDescription className="text-gray-300">
              Actualice los datos del usuario y asigne perfiles según sea necesario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData && userActionPermissions.canEdit ? (
              <div className="text-center text-gray-300 py-10">Cargando datos del usuario...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info *}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre" className="text-gray-200">
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="bg-gray-700 mt-1"
                    />
                    {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
                  </div>
                  <div>
                    <Label htmlFor="apellido" className="text-gray-200">
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="bg-gray-700 mt-1"
                    />
                    {fieldErrors.apellido && <p className="text-red-500 text-xs mt-1">{fieldErrors.apellido}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dni" className="text-gray-200">
                      DNI
                    </Label>
                    <Input
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="bg-gray-700 mt-1"
                    />
                    {fieldErrors.dni && <p className="text-red-500 text-xs mt-1">{fieldErrors.dni}</p>}
                  </div>
                  <div>
                    <Label htmlFor="fechaNacimiento" className="text-gray-200">
                      Fecha de Nacimiento
                    </Label>
                    <Input
                      id="fechaNacimiento"
                      name="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={handleChange}
                      className="bg-gray-700 mt-1"
                      style={{ colorScheme: "dark" }}
                    />
                    {fieldErrors.fechaNacimiento && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.fechaNacimiento}</p>
                    )}
                  </div>
                </div>

                {/* Account Info *}
                <div>
                  <Label htmlFor="email" className="text-gray-200">
                    Email (No editable)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="bg-gray-800 mt-1 text-gray-400"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={handleSwitchChange}
                    className="data-[state=checked]:bg-teal-600 data-[state=unchecked]:bg-gray-600"
                  />
                  <Label htmlFor="activo" className="text-gray-200">
                    Usuario {formData.activo ? "Activo" : "Inactivo"}
                  </Label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPsicologo"
                      checked={isPsicologo}
                      onCheckedChange={handlePsicologoToggle}
                      className="data-[state=checked]:bg-teal-600 data-[state=unchecked]:bg-gray-600"
                    />
                    <Label htmlFor="isPsicologo" className="text-gray-200 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-teal-400" /> Psicólogo
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaciente"
                      checked={isPaciente}
                      onCheckedChange={handlePacienteToggle}
                      className="data-[state=checked]:bg-teal-600 data-[state=unchecked]:bg-gray-600"
                    />
                    <Label htmlFor="isPaciente" className="text-gray-200 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-lime-400" /> Paciente
                    </Label>
                  </div>
                </div>

                {isPsicologo && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="numeroLicencia" className="text-gray-200">
                        Número de Licencia
                      </Label>
                      <Input
                        id="numeroLicencia"
                        name="numeroLicencia"
                        value={formData.numeroLicencia}
                        onChange={handleChange}
                        className="bg-gray-700 mt-1"
                      />
                      {fieldErrors.numeroLicencia && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.numeroLicencia}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="especialidad" className="text-gray-200">
                        Especialidad
                      </Label>
                      <Input
                        id="especialidad"
                        name="especialidad"
                        value={formData.especialidad}
                        onChange={handleChange}
                        className="bg-gray-700 mt-1"
                      />
                      {fieldErrors.especialidad && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.especialidad}</p>
                      )}
                    </div>
                  </div>
                )}

                {isPaciente && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="selectedObraSocialId" className="text-gray-200">
                        Obra Social
                      </Label>
                      <Select value={selectedObraSocialId || ""} onValueChange={handleObraSocialSelectChange}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-200 mt-1">
                          <SelectValue
                            placeholder={isLoadingObrasSociales ? "Cargando..." : "Seleccione Obra Social"}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600" position="popper" sideOffset={4}>
                          {obrasSocialesList.length === 0 ? (
                            <SelectItem
                              value="no-options"
                              disabled
                              className="text-gray-400 focus:bg-gray-700 focus:text-gray-400"
                            >
                              No hay obras sociales disponibles
                            </SelectItem>
                          ) : (
                            obrasSocialesList.map((obra) => (
                              <SelectItem
                                key={obra.id}
                                value={obra.id}
                                className="text-gray-200 focus:bg-gray-700 focus:text-gray-200 cursor-pointer"
                              >
                                {obra.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {fieldErrors.selectedObraSocialId && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.selectedObraSocialId}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Selection *}
                <div className="space-y-2">
                  <Label className="text-gray-200">Perfiles de Usuario</Label>
                  {isLoadingProfiles ? (
                    <p className="text-gray-400">Cargando perfiles...</p>
                  ) : availableProfiles.length === 0 ? (
                    <p className="text-gray-400">No hay perfiles disponibles.</p>
                  ) : (
                    <div className="space-y-2 rounded-md border border-gray-700 p-4 max-h-60 overflow-y-auto">
                      {availableProfiles.map((perfil) => (
                        <div key={perfil.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perfil-${perfil.id}`}
                            checked={selectedProfileIds.includes(perfil.id)}
                            onCheckedChange={(checked) => handleProfileSelectionChange(perfil.id, !!checked)}
                            className="data-[state=checked]:bg-teal-600 border-gray-600"
                          />
                          <Label htmlFor={`perfil-${perfil.id}`} className="text-gray-300 font-normal">
                            {perfil.nombre}
                            {perfil.descripcion && (
                              <span className="text-xs text-gray-400 ml-2">({perfil.descripcion})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p className="text-red-500 text-sm text-center bg-red-900 bg-opacity-30 p-3 rounded-md">{error}</p>
                )}

                <CardFooter className="flex justify-end pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/usuarios/listar")}
                    className="mr-3 text-gray-300 border-gray-600 hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
*/