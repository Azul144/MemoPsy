"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useSession } from "next-auth/react"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AYUDA_CELULAR, normalizarCelular } from "@/lib/telefono"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Brain, Activity, AlertCircle } from "lucide-react"
import { ObraSocial } from "@/models/obra-social.model"
import { ESPECIALIDADES_PSICOLOGIA } from "@/lib/especialidades"
import { avisoExito } from "@/lib/avisos";

// Interfaces
interface Perfil {
  id: string
  nombre: string
  descripcion?: string
}

interface PersonaDetails {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  telefono?: string | null
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
  telefono: string
  numeroLicencia: string
  especialidad: string
}

interface FieldErrors {
  email?: string
  nombre?: string
  apellido?: string
  dni?: string
  fechaNacimiento?: string
  telefono?: string
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
    telefono: "",
    numeroLicencia: "",
    especialidad: "",
  })

  const [isPsicologo, setIsPsicologo] = useState(false)
  const [isPaciente, setIsPaciente] = useState(false)

  // State for Obras Sociales
  const [obrasSocialesList, setObrasSocialesList] = useState<ObraSocial[]>([])
  const [selectedObraSocialId, setSelectedObraSocialId] = useState<string | null>(null)
  const [isLoadingObrasSociales] = useState(false)

  // State for Profiles
  const [availableProfiles, setAvailableProfiles] = useState<Perfil[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
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
        setError("No tenés permiso para editar usuarios.")
        setIsLoadingData(false)
      }

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
          telefono: userData.persona.telefono || "",
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

    if (normalizarCelular(formData.telefono) === undefined) {
      newErrors.telefono = AYUDA_CELULAR
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
        telefono: formData.telefono.trim() || null,
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

  const pageTitle = formData.nombre ? `Editar Usuario: ${formData.nombre} ${formData.apellido}` : "Editar Usuario"

  if (isLoadingData && status !== "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-foreground text-lg">Cargando datos del usuario...</div>
      </div>
    )
  }

  if (!userActionPermissions.canEdit && !isLoadingData) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-peligro" />
          <h1 className="text-3xl font-bold text-peligro mb-4">Acceso Denegado</h1>
          <p className="text-suave mb-6">{error || "No tenés permiso para editar este usuario."}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
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
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-peligro" />
          <h1 className="text-3xl font-bold text-peligro mb-4">Error al Cargar Usuario</h1>
          <p className="text-suave mb-6">{error}</p>
          <Button
            onClick={() => router.push("/usuarios/listar")}
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
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
        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
          <CardContent>
            {isLoadingData && userActionPermissions.canEdit ? (
              <div className="text-center text-suave py-10">Cargando datos del usuario...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre" className="text-texto-2">
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="bg-superficie mt-1"
                    />
                    {fieldErrors.nombre && <p className="text-peligro text-sm mt-1">{fieldErrors.nombre}</p>}
                  </div>
                  <div>
                    <Label htmlFor="apellido" className="text-texto-2">
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="bg-superficie mt-1"
                    />
                    {fieldErrors.apellido && <p className="text-peligro text-sm mt-1">{fieldErrors.apellido}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dni" className="text-texto-2">
                      DNI
                    </Label>
                    <Input
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="bg-superficie mt-1"
                    />
                    {fieldErrors.dni && <p className="text-peligro text-sm mt-1">{fieldErrors.dni}</p>}
                  </div>
                  <div>
                    <Label htmlFor="fechaNacimiento" className="text-texto-2">
                      Fecha de Nacimiento
                    </Label>
                    <Input
                      id="fechaNacimiento"
                      name="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={handleChange}
                      className="bg-superficie mt-1"
                      style={{ colorScheme: "dark" }}
                    />
                    {fieldErrors.fechaNacimiento && (
                      <p className="text-peligro text-sm mt-1">{fieldErrors.fechaNacimiento}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="telefono" className="text-texto-2">
                    Celular
                  </Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    inputMode="tel"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="3704 123456"
                    className="bg-superficie mt-1"
                  />
                  {fieldErrors.telefono ? (
                    <p className="text-peligro text-sm mt-1">{fieldErrors.telefono}</p>
                  ) : (
                    <p className="text-tenue text-sm mt-1">Opcional. Dato de contacto del paciente.</p>
                  )}
                </div>

                {/* Account Info */}
                <div>
                  <Label htmlFor="email" className="text-texto-2">
                    Email (No editable)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="bg-background mt-1 text-tenue"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={handleSwitchChange}
                    className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-superficie"
                  />
                  <Label htmlFor="activo" className="text-texto-2">
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
                      className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-superficie disabled:opacity-50"
                    />
                    <Label htmlFor="isPsicologo" className="text-texto-2 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-info" /> Psicólogo
                      {hasExistingPsicologoData && (
                        <span className="text-sm text-aviso ml-2">
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
                      className="data-[state=checked]:bg-primary !text-primary-foreground data-[state=unchecked]:bg-superficie disabled:opacity-50"
                    />
                    <Label htmlFor="isPaciente" className="text-texto-2 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-lime-400" /> Paciente
                      {hasExistingPacienteData && (
                        <span className="text-sm text-aviso ml-2">
                          (No se puede desactivar - datos existentes)
                        </span>
                      )}
                    </Label>
                  </div>
                </div>

                {isPsicologo && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="numeroLicencia" className="text-texto-2">
                        Número de Licencia
                      </Label>
                      <Input
                        id="numeroLicencia"
                        name="numeroLicencia"
                        value={formData.numeroLicencia}
                        onChange={handleChange}
                        className="bg-superficie mt-1"
                      />
                      {fieldErrors.numeroLicencia && (
                        <p className="text-peligro text-sm mt-1">{fieldErrors.numeroLicencia}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="especialidad" className="text-texto-2">
                        Especialidad
                      </Label>
                      <Select
                        name="especialidad"
                        value={formData.especialidad}
                        onValueChange={handleEspecialidadChange}
                      >
                        <SelectTrigger id="especialidad" className="bg-superficie border-borde-fuerte text-texto-2 mt-1">
                          <SelectValue placeholder="Elegí una especialidad" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-borde-fuerte">
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
                              className="text-texto-2 cursor-pointer hover:!bg-teal-700/60 hover:!text-aviso focus:!bg-teal-700/60 focus:!text-aviso data-[state=checked]:!text-aviso"
                            >
                              {esp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.especialidad && (
                        <p className="text-peligro text-sm mt-1">{fieldErrors.especialidad}</p>
                      )}
                    </div>
                  </div>
                )}

                {isPaciente && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div>
                      <Label htmlFor="selectedObraSocialId" className="text-texto-2">
                        Obra Social
                      </Label>
                      <Select 
                        name="selectedObraSocialId" 
                        value={selectedObraSocialId || ""} 
                        onValueChange={handleObraSocialSelectChange}
                      >
                        <SelectTrigger className="bg-superficie border-borde-fuerte text-texto-2 mt-1">
                          <SelectValue 
                            placeholder={isLoadingObrasSociales ? "Cargando..." : "Elegí la obra social"}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-borde-fuerte">
                          {obrasSocialesList.length === 0 ? (
                            <SelectItem value="no-options" disabled className="text-tenue">
                              No hay obras sociales disponibles
                            </SelectItem>
                          ) : (
                            obrasSocialesList.map((obra) => (
                              <SelectItem
                                key={obra.id}
                                value={obra.id}
                                className="text-texto-2 cursor-pointer hover:!bg-teal-700/60 hover:!text-aviso focus:!bg-teal-700/60 focus:!text-aviso data-[state=checked]:!text-aviso"
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
                        <p className="text-aviso text-sm mt-1">
                          Paciente particular: abona la sesión en efectivo o por QR del psicólogo.
                        </p>
                      )}
                      {fieldErrors.selectedObraSocialId && (
                        <p className="text-peligro text-sm mt-1">{fieldErrors.selectedObraSocialId}</p>
                      )}
                    </div>
                  </div>
                )}
                {/* Profile Selection */}
                <div className="space-y-2">
                  <Label className="text-texto-2">Perfiles de Usuario</Label>
                  {isLoadingProfiles ? (
                    <p className="text-tenue">Cargando perfiles...</p>
                  ) : availableProfiles.length === 0 ? (
                    <p className="text-tenue">No hay perfiles disponibles.</p>
                  ) : (
                    <div className="space-y-2 rounded-md border border-borde p-4 max-h-60 overflow-y-auto">
                      {availableProfiles.map((perfil) => (
                        <div key={perfil.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perfil-${perfil.id}`}
                            checked={selectedProfileIds.includes(perfil.id)}
                            onCheckedChange={(checked) => handleProfileSelectionChange(perfil.id, !!checked)}
                            className="data-[state=checked]:bg-primary !text-primary-foreground border-borde-fuerte"
                          />
                          <Label htmlFor={`perfil-${perfil.id}`} className="text-suave font-normal">
                            {perfil.nombre}
                            {perfil.descripcion && (
                              <span className="text-sm text-tenue ml-2">({perfil.descripcion})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p className="text-peligro text-sm text-center bg-red-500/10 bg-opacity-30 p-3 rounded-md">{error}</p>
                )}

                <CardFooter className="flex justify-end pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/usuarios/listar")}
                    className="mr-3 text-suave border-borde-fuerte hover:bg-superficie"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary !text-primary-foreground hover:bg-primary/90 text-foreground">
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
