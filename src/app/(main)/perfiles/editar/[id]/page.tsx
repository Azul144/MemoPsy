"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from "next-auth/react"
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter, useParams } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, KeyRound, CheckCircle, ShieldCheck } from "lucide-react"



interface PerfilFormData {
  nombre: string
  descripcion: string
}

interface PermisoFromAPI {
  id: string
  nombre: string
  descripcion?: string
  modulo: string
}

interface GroupedPermisos {
  [modulo: string]: PermisoFromAPI[]
}

interface FieldErrors {
  nombre?: string
  descripcion?: string
  general?: string
}

export default function EditarPerfilPage() { // Renamed component
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams() // Added useParams
  const id = params.id as string | string[] // Get id from params

  const [formData, setFormData] = useState<PerfilFormData>({
    nombre: "",
    descripcion: "",
  })

  const [allPermisosList, setAllPermisosList] = useState<PermisoFromAPI[]>([])
  const [groupedPermisos, setGroupedPermisos] = useState<GroupedPermisos>({})
  const [selectedPermisoIds, setSelectedPermisoIds] = useState<Set<string>>(new Set())
  const [isLoadingPermisos, setIsLoadingPermisos] = useState(false)
  const [errorPermisos, setErrorPermisos] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false) // For form submission
  const [error, setError] = useState<string | null>(null) // For form submission
  const [success, setSuccess] = useState<string | null>(null) // For form submission
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidosNav, setModulosPermitidosNav] = useState<ModuloConfig[]>([])
  const [hasPermissionPage, setHasPermissionPage] = useState<boolean | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // For loading profile data
  const [profileError, setProfileError] = useState<string | null>(null); // For loading profile data error

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    let canEditPerfil = false // Changed variable name
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)
      canEditPerfil = userPermissions.includes("Editar Perfil") // Changed permission string

      if (canEditPerfil) {
        setHasPermissionPage(true)
        fetchPermisos() // This fetches all available permissions for the checkboxes
      } else {
        setHasPermissionPage(false)
        // setError("No tienes permiso para editar perfiles.") // Old error state
        setProfileError("No tienes permiso para editar perfiles.") // Use profileError for this
        setIsLoadingProfile(false); // If no permission, stop profile loading
      }

      const filteredNavModules = MODULOS_DISPONIBLES.filter((module) =>
        module.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidosNav(filteredNavModules)
    } else if (status === "authenticated" && !session?.user?.permisos) {
      setHasPermissionPage(false)
      // setError("No se pudieron verificar los permisos del usuario.") // Old error state
      setProfileError("No se pudieron verificar los permisos del usuario.") // Use profileError
      setIsLoadingProfile(false);
    }
  }, [session, status, router])


  // useEffect to fetch profile data when id is available and user has permission
  useEffect(() => {
    if (status === "authenticated" && id && hasPermissionPage === true) {
      const profileIdToFetch = Array.isArray(id) ? id[0] : id;
      setIsLoadingProfile(true);
      setProfileError(null);

      fetch(`/api/perfiles/${profileIdToFetch}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Error al cargar el perfil ${profileIdToFetch}`);
          }
          return res.json();
        })
        .then((data) => {
          if(data && data.nombre && data.descripcion) {
            setFormData({ nombre: data.nombre, descripcion: data.descripcion });
            const currentPermisoIds = new Set<string>(data.permisos?.map((p: { id: string }) => p.id) || []);
            setSelectedPermisoIds(currentPermisoIds);
          } else {
            throw new Error("Datos del perfil incompletos o inválidos.");
          }
        })
        .catch((err: any) => {
          setProfileError(err.message || "Error cargando datos del perfil.");
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    } else if (hasPermissionPage === false && status === "authenticated") {
      // If permission check already failed and we are authenticated,
      // ensure loading is false and potentially set error if not already set by main permission check.
      setIsLoadingProfile(false);
      if (!profileError) { // Avoid overwriting specific permission error
        setProfileError("No se puede cargar el perfil debido a un problema de permisos o datos faltantes.");
      }
    } else if (status === "unauthenticated") {
        // If unauthenticated, also ensure loading is false. Redirect is handled by the other effect.
        setIsLoadingProfile(false);
    }
    // Adding `router` to dependencies as it's a stable function from Next.js but good practice.
    // `profileError` is added to avoid issues if it was set by the other effect.
  }, [id, session, status, hasPermissionPage, router, profileError]);

  const fetchPermisos = async () => {
    setIsLoadingPermisos(true)
    setErrorPermisos(null)

    try {
      const response = await fetch("/api/permisos")
      if (!response.ok) {
        throw new Error("Error al cargar los permisos disponibles")
      }

      const permisos: PermisoFromAPI[] = await response.json()
      setAllPermisosList(permisos)

      const grouped = permisos.reduce((acc, permiso) => {
        const modulo = permiso.modulo || "General"
        if (!acc[modulo]) acc[modulo] = []
        acc[modulo].push(permiso)
        return acc
      }, {} as GroupedPermisos)

      setGroupedPermisos(grouped)
    } catch (err: any) {
      setErrorPermisos(err.message || "Error al cargar permisos")
    } finally {
      setIsLoadingPermisos(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  const handlePermisoChange = (permisoId: string, checked: boolean) => {
    setSelectedPermisoIds((prev) => {
      const newSet = new Set(prev)
      if (checked) newSet.add(permisoId)
      else newSet.delete(permisoId)
      return newSet
    })
  }

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre del perfil es requerido."
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres."
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción del perfil es requerida."
    } else if (formData.descripcion.trim().length < 10) {
      newErrors.descripcion = "La descripción debe tener al menos 10 caracteres."
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    if (!validateForm()) return

    setIsLoading(true)
    setError(null) // Clear previous errors
    setSuccess(null) // Clear previous success messages
    const profileIdToUpdate = Array.isArray(id) ? id[0] : id;

    try {
      const perfilDataToSend = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        permisos: Array.from(selectedPermisoIds),
      }

      const response = await fetch(`/api/perfiles/${profileIdToUpdate}`, { // Use ID in URL
        method: "PUT", // Changed to PUT
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(perfilDataToSend),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.errors) {
          setFieldErrors(errorData.errors)
        }
        throw new Error(errorData.message || "Error al actualizar el perfil.") // Updated message
      }

      // const result = await response.json(); // Not using result directly
      await response.json(); // Process the response
      setSuccess(
        `Perfil "${perfilDataToSend.nombre}" actualizado exitosamente.`, // Updated message
      )

      // Redirect after successful update
      setTimeout(() => {
        router.push("/perfiles/listar")
      }, 2000)
    } catch (err: any) {
      console.error("Error en actualización de perfil:", err) // Updated log message
      setError(err.message || "Ocurrió un error desconocido.")

      if (err.message && err.message.includes("ya existe") && !fieldErrors.nombre) {
        setFieldErrors((prev) => ({ ...prev, nombre: "Este nombre de perfil ya existe." }))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    // The "Limpiar" button is disabled as per requirements.
    // If it were to re-fetch data, the logic would be:
    // if (id && hasPermissionPage) {
    //   const profileId = Array.isArray(id) ? id[0] : id;
    //   setIsLoadingProfile(true);
    //   setProfileError(null);
    //   setError(null); 
    //   setSuccess(null);
    //   setFieldErrors({});
    //   fetch(`/api/perfiles/${profileId}`)
    //     /* ... rest of fetch logic ... */
    // }
  }

  const handleLogout = async () => await cerrarSesion()
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }

  // Updated loading condition
  if (status === "loading" || hasPermissionPage === null || (hasPermissionPage === true && isLoadingProfile)) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#152A2A" }}>
        <div className="text-white text-lg">Cargando...</div>
      </div>
    )
  }

  if (hasPermissionPage === false) { // Access Denied page
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          {/* Display profileError first if it exists (e.g. permission denied), then form error */}
          <p className="text-gray-300 mb-6">{profileError || error || "No tienes los permisos necesarios para acceder a esta página."}</p>
          <Button onClick={() => router.push("/perfiles")} style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}>
            Volver a Perfiles
          </Button>
        </main>
      </div>
    )
  }

  const nombreCompleto = session?.user?.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session?.user?.email || "Usuario"

  return (
    <div className="min-h-screen">

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo={<>Editar Perfil {/* Changed Title */}</>} descripcion={<>Actualiza los detalles y permisos del perfil. {/* Changed Description */}</>} volverA="/perfiles" textoVolver="Volver a Perfiles" />
        <Card className="max-w-4xl mx-auto" style={{ backgroundColor: "#1D3434", borderColor: "#2A4A4A" }}>

          <CardContent>
            {success && (
              <Alert className="mb-6 border-green-500 bg-green-900 bg-opacity-30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">{success}</AlertDescription>
              </Alert>
            )}

            {error && ( // For form submission errors
              <Alert className="mb-6 border-red-500 bg-red-500/10 bg-opacity-30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {/* Alert for profile loading errors - displayed if profileError is set and no form submission error is active */}
            {profileError && !error && (
              <Alert className="mb-6 border-red-500 bg-red-500/10 bg-opacity-30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{profileError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nombre" className="text-gray-200 font-medium">
                    Nombre del Perfil *
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="bg-[#2A4242] text-white border-gray-600 focus:ring-teal-500 focus:border-teal-500 mt-2"
                    placeholder="Ej: Administrador, Paciente, Supervisor"
                  />
                  {fieldErrors.nombre && <p className="text-red-400 text-sm mt-1">{fieldErrors.nombre}</p>}
                </div>

                <div>
                  <Label htmlFor="descripcion" className="text-gray-200 font-medium">
                    Descripción *
                  </Label>
                  <Textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    required
                    className="bg-[#2A4242] text-white border-gray-600 focus:ring-teal-500 focus:border-teal-500 mt-2 h-24"
                    placeholder="Describe las responsabilidades y alcance de este perfil..."
                  />
                  {fieldErrors.descripcion && <p className="text-red-400 text-sm mt-1">{fieldErrors.descripcion}</p>}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center mb-4">
                  <KeyRound className="w-6 h-6 mr-3 text-teal-400" />
                  <h3 className="text-xl font-semibold text-gray-100">Asignar Permisos</h3>
                  <span className="ml-auto text-sm text-gray-400">
                    {selectedPermisoIds.size} permisos seleccionados
                  </span>
                </div>

                {isLoadingPermisos && (
                  <div className="text-center py-8">
                    <div className="text-gray-300">Cargando permisos disponibles...</div>
                  </div>
                )}

                {errorPermisos && (
                  <Alert className="border-red-500 bg-red-500/10 bg-opacity-30">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">{errorPermisos}</AlertDescription>
                  </Alert>
                )}

                {!isLoadingPermisos && !errorPermisos && Object.keys(groupedPermisos).length === 0 && (
                  <div className="text-center py-8 text-gray-400">No hay permisos disponibles para asignar.</div>
                )}

                {Object.entries(groupedPermisos).map(([modulo, permisosDelModulo]) => (
                  <Card key={modulo} className="bg-[#152B2B] border-gray-700 shadow-sm">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-lg font-medium flex items-center" style={{ color: "#F1C77A" }}>
                        Módulo - {modulo}
                        <span className="ml-auto text-sm text-gray-400">
                          {permisosDelModulo.filter((p) => selectedPermisoIds.has(p.id)).length}/
                          {permisosDelModulo.length}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                      {permisosDelModulo.map((permiso) => (
                        <div
                          key={permiso.id}
                          className="flex items-start space-x-3 p-2 rounded-md hover:bg-[#2A4242] transition-colors"
                        >
                          <Checkbox
                            id={`permiso-${permiso.id}`}
                            checked={selectedPermisoIds.has(permiso.id)}
                            onCheckedChange={(checked) => handlePermisoChange(permiso.id, Boolean(checked))}
                            className="border-gray-500 data-[state=checked]:bg-primary !text-primary-foreground data-[state=checked]:border-teal-600 mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`permiso-${permiso.id}`}
                              className="text-gray-300 text-sm cursor-pointer select-none font-medium leading-tight"
                            >
                              {permiso.nombre}
                            </Label>
                            {permiso.descripcion && (
                              <p className="text-xs text-gray-500 mt-1 leading-tight">{permiso.descripcion}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {fieldErrors.general && (
                <Alert className="border-red-500 bg-red-500/10 bg-opacity-30">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{fieldErrors.general}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/perfiles")}
                    className="text-gray-300 border-gray-600 hover:bg-[#2A4242]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="text-gray-300 border-gray-600 hover:bg-[#2A4242]"
                    disabled={isLoading || isLoadingProfile || true} // Disabled "Limpiar" button as per instruction
                  >
                    Limpiar
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isLoadingPermisos || isLoadingProfile} // Consider isLoadingProfile too
                  style={{ backgroundColor: "#F1C77A", color: "#1D3434" }}
                  className="font-semibold py-3 px-8 rounded-lg transition-colors duration-300 flex items-center justify-center min-w-[200px]"
                >
                  <ShieldCheck className="w-5 h-5 mr-2" /> {/* Changed Icon */}
                  {isLoading ? "Guardando..." : "Guardar Cambios"} {/* Changed Text */}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
