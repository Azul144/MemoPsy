"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from "next-auth/react"

import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AYUDA_CELULAR, normalizarCelular } from "@/lib/telefono"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, UserPlusIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"

// Importar modelos de dominio
import { Usuario } from "@/models/usuario.model"
import { Persona } from "@/models/persona.model"
import { Psicologo } from "@/models/psicologo.model"
import { ObraSocial } from "@/models/obra-social.model"
import { ESPECIALIDADES_PSICOLOGIA } from "@/lib/especialidades"

import { avisoExito } from "@/lib/avisos";
import InputPassword from "@/components/InputPassword"
import RequisitosPassword from "@/components/RequisitosPassword"
import { validarPassword } from "@/lib/validaciones/password"



// Remover esta línea:
// const OBRAS_SOCIALES_MOCK: ObraSocial[] = [...]

interface FormData {
  email: string
  password: string
  confirmPassword: string
  nombre: string
  apellido: string
  dni: string
  fecha_nacimiento: string
  telefono: string
  numeroLicencia: string
  especialidad: string
}

interface FieldErrors {
  email?: string
  password?: string
  confirmPassword?: string
  nombre?: string
  apellido?: string
  dni?: string
  fecha_nacimiento?: string
  telefono?: string
  numeroLicencia?: string
  especialidad?: string
  selectedObraSocialId?: string
  roleSelection?: string
  general?: string
}

export default function RegistrarUsuarioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    apellido: "",
    dni: "",
    fecha_nacimiento: "",
    telefono: "",
    numeroLicencia: "",
    especialidad: "",
  })

  const [isPsicologo, setIsPsicologo] = useState(false)
  const [isPaciente, setIsPaciente] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // State for Obras Sociales
  const [obrasSocialesList, setObrasSocialesList] = useState<ObraSocial[]>([])
  const [selectedObraSocialId, setSelectedObraSocialId] = useState<string>("")
  const [isLoadingObrasSociales, setIsLoadingObrasSociales] = useState(false)
  const [errorObrasSociales, setErrorObrasSociales] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)

      if (userPermissions.includes("Registrar Usuario")) {
        setHasPermission(true)
      } else {
        setHasPermission(false)
      }

      const filteredMainModules = MODULOS_DISPONIBLES.filter((module) =>
        module.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setHasPermission(false)
      setError("No se pudieron verificar los permisos del usuario.")
    }
  }, [session, status, router])

  // Fetch Obras Sociales when isPaciente is true
  useEffect(() => {
    if (isPaciente && hasPermission) {
      setIsLoadingObrasSociales(true)
      setErrorObrasSociales(null)
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
        .catch((err) => {
          console.error("Error fetching obras sociales:", err)
          setErrorObrasSociales(err.message || "Error al cargar obras sociales.")
          setObrasSocialesList([])
        })
        .finally(() => setIsLoadingObrasSociales(false))
    } else {
      setObrasSocialesList([])
      setSelectedObraSocialId("")
    }
  }, [isPaciente, hasPermission])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // Psicólogo y Paciente son excluyentes: activar uno apaga el otro
  const handlePsicologoToggle = (checked: boolean) => {
    if (checked) {
      setFieldErrors((prev) => ({ ...prev, roleSelection: undefined }))
      handlePacienteToggle(false)
    }
    setIsPsicologo(checked)
    if (!checked) {
      setFormData((prev) => ({ ...prev, numeroLicencia: "", especialidad: "" }))
      setFieldErrors((prev) => ({ ...prev, numeroLicencia: undefined, especialidad: undefined }))
    }
  }

  const handlePacienteToggle = (checked: boolean) => {
    if (checked) {
      setFieldErrors((prev) => ({ ...prev, roleSelection: undefined }))
      handlePsicologoToggle(false)
    }
    setIsPaciente(checked)
    if (!checked) {
      setSelectedObraSocialId("")
      setFieldErrors((prev) => ({ ...prev, selectedObraSocialId: undefined }))
    }
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

    // Validaciones básicas
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido."
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El formato del email no es válido."
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida."
    } else {
      const problemas = validarPassword(formData.password, formData.email)
      if (problemas.length > 0) {
        newErrors.password = `Falta: ${problemas.join(", ").toLowerCase()}.`
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden."
    }

    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido."
    if (!formData.apellido.trim()) newErrors.apellido = "El apellido es requerido."

    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es requerido."
    } else if (!/^\d{7,8}$/.test(formData.dni)) {
      newErrors.dni = "El DNI debe ser numérico y tener 7 u 8 dígitos."
    }

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = "La fecha de nacimiento es requerida."
    }

    if (normalizarCelular(formData.telefono) === undefined) {
      newErrors.telefono = AYUDA_CELULAR
    }

    if (isPsicologo === isPaciente) {
      newErrors.roleSelection = "Debe seleccionar si el usuario es Psicólogo o Paciente."
    }

    // Validaciones específicas para psicólogo
    if (isPsicologo) {
      if (!formData.numeroLicencia?.trim()) {
        newErrors.numeroLicencia = "El número de licencia es requerido para psicólogos."
      }
      if (!formData.especialidad?.trim()) {
        newErrors.especialidad = "La especialidad es requerida para psicólogos."
      }
    }

    // Validaciones específicas para paciente
    if (isPaciente) {
      if (!selectedObraSocialId) {
        newErrors.selectedObraSocialId = "Debe seleccionar una obra social para pacientes."
      }
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Crear modelo de Persona usando el constructor
      const fechaNacimiento = new Date(formData.fecha_nacimiento)
      const persona = new Persona({
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        dni: formData.dni.trim(),
        fechaNacimiento: fechaNacimiento,
      })

      // Crear modelo de Usuario
      const usuario = new Usuario({
        email: formData.email.trim(),
        password: formData.password,
        activo: true,
        ultimoAcceso: new Date(),
        persona: persona,
      })

      // Preparar datos para envío
      const registrationData: any = {
        persona: { ...persona.toEntity(), telefono: formData.telefono.trim() || null },
        usuario: usuario.toEntity(),
        roles: {
          isPsicologo,
          isPaciente,
        },
      }

      // Agregar datos específicos de psicólogo si aplica
      if (isPsicologo) {
        const psicologo = new Psicologo({
          especialidad: formData.especialidad.trim(),
          numeroLicencia: formData.numeroLicencia.trim(),
        })
        registrationData.psicologo = psicologo.toEntity()
      }

      // Agregar datos específicos de paciente si aplica
      if (isPaciente) {
        registrationData.paciente = {
          id_obra_social: selectedObraSocialId,
        }
      }

      // Enviar datos al endpoint de registro
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.errors) {
          setFieldErrors(result.errors)
        }
        throw new Error(result.message || "Error al registrar el usuario.")
      }

      // Mostrar mensaje de éxito con los datos guardados
      avisoExito(`Usuario registrado correctamente como ${isPsicologo ? "Psicólogo" : "Paciente"}.`)

      resetForm()
      router.push("/usuarios")
    } catch (err: any) {
      console.error("Registration process error:", err)
      setError(err.message || "Ocurrió un error desconocido durante el registro.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      nombre: "",
      apellido: "",
      dni: "",
      fecha_nacimiento: "",
      telefono: "",
      numeroLicencia: "",
      especialidad: "",
    })
    setIsPsicologo(false)
    setIsPaciente(false)
    setSelectedObraSocialId("")
    setFieldErrors({})
    setError(null)
  }

  const handleLogout = async () => {
    await cerrarSesion()
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }

  // Render states
  if (status === "loading" || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-foreground text-lg">Cargando sesión y permisos...</div>
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <h1 className="text-3xl font-bold text-peligro mb-4">Acceso Denegado</h1>
          <p className="text-suave mb-6">No tenés los permisos necesarios para registrar usuarios.</p>
          <Button onClick={() => router.push("/usuarios")} style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            Volver a Usuarios
          </Button>
        </main>
      </div>
    )
  }

  // Main content if user has permission
  const nombreCompleto = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Registrar usuario" descripcion="Completá los datos para crear la cuenta." volverA="/usuarios" textoVolver="Volver a Usuarios" />
        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-texto-2">
                    Nombre *
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                  />
                  {fieldErrors.nombre && <p className="text-peligro text-sm">{fieldErrors.nombre}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-texto-2">
                    Apellido *
                  </Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                  />
                  {fieldErrors.apellido && <p className="text-peligro text-sm">{fieldErrors.apellido}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="dni" className="text-texto-2">
                    DNI *
                  </Label>
                  <Input
                    id="dni"
                    name="dni"
                    type="text"
                    value={formData.dni}
                    onChange={handleChange}
                    required
                    className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                  />
                  {fieldErrors.dni && <p className="text-peligro text-sm">{fieldErrors.dni}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento" className="text-texto-2">
                    Fecha de Nacimiento *
                  </Label>
                  <Input
                    id="fecha_nacimiento"
                    name="fecha_nacimiento"
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={handleChange}
                    required
                    className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                    style={{ colorScheme: "dark" }}
                  />
                  {fieldErrors.fecha_nacimiento && (
                    <p className="text-peligro text-sm">{fieldErrors.fecha_nacimiento}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
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
                  className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                />
                {fieldErrors.telefono ? (
                  <p className="text-peligro text-sm">{fieldErrors.telefono}</p>
                ) : (
                  <p className="text-tenue text-sm">Opcional. Dato de contacto del paciente.</p>
                )}
              </div>

              {/* Account Info */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-texto-2">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                />
                {fieldErrors.email && <p className="text-peligro text-sm">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-texto-2">
                      Contraseña *
                    </Label>
                    <InputPassword
                      id="password"
                      name="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      aria-describedby="requisitos-password"
                      required
                    />
                    {fieldErrors.password && <p className="text-peligro text-sm">{fieldErrors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-texto-2">
                      Confirmar Contraseña *
                    </Label>
                    <InputPassword
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.confirmPassword ? (
                      <p className="text-peligro text-sm">{fieldErrors.confirmPassword}</p>
                    ) : (
                      formData.confirmPassword.length > 0 &&
                      formData.password !== formData.confirmPassword && (
                        <p className="text-peligro text-sm">Las contraseñas no coinciden.</p>
                      )
                    )}
                  </div>
                </div>
                <div id="requisitos-password" className="rounded-md border border-borde bg-background/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-tenue">La contraseña debe tener</p>
                  <RequisitosPassword password={formData.password} />
                </div>
              </div>

              {/* User Type Specific Toggles and Fields */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="isPsicologo" checked={isPsicologo} onCheckedChange={handlePsicologoToggle} />
                  <Label htmlFor="isPsicologo" className="text-texto-2 flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-info" /> Registrar como Psicólogo
                  </Label>
                </div>

                {isPsicologo && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div className="space-y-2">
                      <Label htmlFor="numeroLicencia" className="text-suave">
                        Número de Licencia *
                      </Label>
                      <Input
                        id="numeroLicencia"
                        name="numeroLicencia"
                        value={formData.numeroLicencia}
                        onChange={handleChange}
                        required={isPsicologo}
                        className="bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500"
                      />
                      {fieldErrors.numeroLicencia && (
                        <p className="text-peligro text-sm">{fieldErrors.numeroLicencia}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="especialidad" className="text-suave">
                        Especialidad *
                      </Label>
                      <Select
                        name="especialidad"
                        value={formData.especialidad}
                        onValueChange={handleEspecialidadChange}
                        required={isPsicologo}
                      >
                        <SelectTrigger
                          id="especialidad"
                          className="w-full bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500 data-[placeholder]:text-tenue"
                        >
                          <SelectValue placeholder="Elegí una especialidad" />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
                          {ESPECIALIDADES_PSICOLOGIA.map((esp) => (
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
                        <p className="text-peligro text-sm">{fieldErrors.especialidad}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="isPaciente" checked={isPaciente} onCheckedChange={handlePacienteToggle} />
                  <Label htmlFor="isPaciente" className="text-texto-2 flex items-center">
                    <UserPlusIcon className="w-5 h-5 mr-2 text-lime-400" /> Registrar como Paciente
                  </Label>
                </div>

                {isPaciente && (
                  <div className="pl-8 space-y-4 transition-all duration-300 ease-in-out">
                    <div className="space-y-2">
                      <Label htmlFor="selectedObraSocialId" className="text-suave">
                        Obra Social *
                      </Label>
                      <Select
                        name="selectedObraSocialId"
                        value={selectedObraSocialId}
                        onValueChange={handleObraSocialSelectChange}
                        required={isPaciente}
                        disabled={isLoadingObrasSociales}
                      >
                        <SelectTrigger
                          id="selectedObraSocialId"
                          className="w-full bg-superficie text-foreground border-borde-fuerte focus:ring-teal-500 focus:border-teal-500 data-[placeholder]:text-tenue"
                        >
                          <SelectValue
                            placeholder={isLoadingObrasSociales ? "Cargando obras sociales..." : "Elegí una obra social"}
                          />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
                          {obrasSocialesList.length === 0 ? (
                            <SelectItem value="no-options" disabled className="text-tenue">
                              No hay obras sociales
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
                        <p className="text-aviso text-sm">
                          Paciente particular: abona la sesión en efectivo o por QR del psicólogo.
                        </p>
                      )}
                      {errorObrasSociales && <p className="text-peligro text-sm">{errorObrasSociales}</p>}
                      {fieldErrors.selectedObraSocialId && (
                        <p className="text-peligro text-sm">{fieldErrors.selectedObraSocialId}</p>
                      )}
                    </div>
                  </div>
                )}
                {fieldErrors.roleSelection && <p role="alert" className="text-peligro text-sm">{fieldErrors.roleSelection}</p>}
              </div>

              {error && (
                <p className="text-peligro text-sm text-center bg-red-500/10 bg-opacity-30 p-3 rounded-md">{error}</p>
              )}

              <CardFooter className="flex justify-end pt-6">
                <Button
                  type="submit"
                  disabled={isLoading || isLoadingObrasSociales}
                  className="bg-primary !text-primary-foreground hover:bg-primary/90 text-foreground font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                  {isLoading ? "Registrando..." : "Registrar Usuario"}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}