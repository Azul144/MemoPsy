"use client"

import { useState, useEffect, useRef } from "react"
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from "next-auth/react"
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import { useRouter } from "next/navigation"
import MemopsyLogo from "@/app/components/MemopsyLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { DIAS_NO_HABILES, MENSAJE_DIA_NO_HABIL, esDiaHabil, esFechaHabil, proximoDiaHabil } from "@/lib/validaciones/dias-habiles"
import { Badge } from "@/components/ui/badge"
import { TypographyP } from '@/components/ui/typography';
import { Loader2, X, CalendarIcon, CalendarClock, Plus, Users, User, Brain, Clock, MapPin, Activity, Check, Pencil, Wallet, Video } from "lucide-react"
import { format, parseISO, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { avisoExito, avisoError, confirmar } from "@/lib/avisos";
import DialogoPago, { type PagoSesion, type MedioDePago } from "@/components/sesiones/DialogoPago";
import DialogoHorarios from "@/components/sesiones/DialogoHorarios";
import DialogoReprogramar from "@/components/sesiones/DialogoReprogramar";

interface Sesion {
  id: string
  fechaHoraInicio: string
  fechaHoraFin: string
  psicologo?: {
    id: string
    persona: {
      nombre: string
      apellido: string
    }
  }
  modalidad?: {
    id: string
    nombre: string
  }
  enlaceVideollamada?: string | null
  estado?: {
    id: string
    nombre: string
  }
  pacientes?: Array<{
    id: string
    persona: {
      nombre: string
      apellido: string
    }
    // Solo llega a quien tiene el permiso "Registrar Pago"
    obraSocial?: { id: string; nombre: string } | null
  }>
  // RF 3.5 - Solo llega a quien tiene el permiso "Registrar Pago"
  pago?: PagoSesion
}

interface Psicologo {
  id: string
  especialidad?: string
  persona: {
    nombre: string
    apellido: string
    nombreCompleto: string
  }
}

interface Paciente {
  id: string
  // true si ya tuvo sesiones con el psicólogo elegido en el formulario
  esDelPsicologo?: boolean
  persona: {
    nombre: string
    apellido: string
    nombreCompleto: string
  }
}



export default function SesionesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [psicologos, setPsicologos] = useState<Psicologo[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [modalidades, setModalidades] = useState<any[]>([])
  const [estados, setEstados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Búsqueda de psicólogos y pacientes
  const [psicologoSearch, setPsicologoSearch] = useState("")
  const [pacienteSearch, setPacienteSearch] = useState("")
  const [psicologoSearchResults, setPsicologoSearchResults] = useState<Psicologo[]>([])
  const [pacienteSearchResults, setPacienteSearchResults] = useState<Paciente[]>([])
  const [isPsicologoPopoverOpen, setIsPsicologoPopoverOpen] = useState(false)
  const [isPacientePopoverOpen, setIsPacientePopoverOpen] = useState(false)
  const [selectedPacientes, setSelectedPacientes] = useState<Paciente[]>([])

  // Permisos del usuario
  const [permisos, setPermisos] = useState<string[]>([])

  // Form state
  const [formData, setFormData] = useState({
    fechaInicio: format(proximoDiaHabil(new Date()), "yyyy-MM-dd"),
    horaInicio: "09:00",
    fechaFin: format(proximoDiaHabil(new Date()), "yyyy-MM-dd"),
    horaFin: "10:00",
    psicologoId: "",
    modalidadId: "",
    estadoId: "",
    enlaceVideollamada: "",
    pacientesIds: [] as string[],
  })

  const [editingSesion, setEditingSesion] = useState<Sesion | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
      id: "", // To store the ID of the session being edited
      fechaInicio: "",
      horaInicio: "",
      fechaFin: "",
      horaFin: "",
      psicologoId: "",
      modalidadId: "",
      estadoId: "",
      enlaceVideollamada: "",
      pacientesIds: [] as string[],
  });
  const [editPsicologoSearchResults, setEditPsicologoSearchResults] = useState<Psicologo[]>([]);
  const [editPacienteSearchResults, setEditPacienteSearchResults] = useState<Paciente[]>([]);
  const [isEditPsicologoPopoverOpen, setIsEditPsicologoPopoverOpen] = useState(false);
  const [isEditPacientePopoverOpen, setIsEditPacientePopoverOpen] = useState(false);
  const [editSelectedPacientes, setEditSelectedPacientes] = useState<Paciente[]>([]);
  const [editPsicologoSearch, setEditPsicologoSearch] = useState("");
  const [editPacienteSearch, setEditPacienteSearch] = useState("");
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // RF 3.5 - Pago de sesiones
  const [mediosDePago, setMediosDePago] = useState<MedioDePago[]>([])
  const [sesionPago, setSesionPago] = useState<Sesion | null>(null)
  // RF 4.3 - Horarios que habilita el psicólogo y turno que el paciente quiere mover
  const [horariosAbierto, setHorariosAbierto] = useState(false)
  const [sesionReprogramar, setSesionReprogramar] = useState<Sesion | null>(null)

  // Refs para debounce
  const psicologoSearchTimeout = useRef<NodeJS.Timeout | null>(null)
  const pacienteSearchTimeout = useRef<NodeJS.Timeout | null>(null)

  // RF 3.4 - ¿la modalidad elegida es remota? (para mostrar/pedir el enlace de videollamada)
  const esModalidadRemota = (modalidadId: string) =>
    modalidades.find((m) => String(m.id) === String(modalidadId))?.nombre?.toLowerCase() === "remota";

  // Estados del turno: color del badge e id a partir del nombre.
  const colorEstado = (nombre?: string) => {
    switch (nombre) {
      case "Confirmada": return "border-emerald-500 text-exito";
      case "Cancelada": return "border-red-500 text-peligro";
      case "Finalizada": return "border-sky-500 text-info";
      case "Reprogramada": return "border-orange-400 text-naranja";
      default: return "border-amber-400 text-aviso"; // Pendiente u otros
    }
  };
  const estadoIdPorNombre = (nombre: string) =>
    estados.find((e) => e.nombre === nombre)?.id as string | undefined;

  // Acción rápida: cambiar el estado de un turno (confirmar / cancelar).
  const cambiarEstadoSesion = async (sesion: Sesion, nombreEstado: string) => {
    const estadoId = estadoIdPorNombre(nombreEstado);
    if (!estadoId) return;
    if (nombreEstado === "Cancelada") {
      const ok = await confirmar("¿Seguro que querés cancelar este turno?", "Sí, cancelar");
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/sesiones/${sesion.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoId: Number(estadoId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        avisoError(data.error || "No se pudo cambiar el estado del turno.");
        return;
      }
      await loadInitialData(selectedDate);
      avisoExito(nombreEstado === "Confirmada" ? "Turno confirmado." : "Turno cancelado.");
    } catch (error) {
      console.error("Error cambiando el estado:", error);
      avisoError("No se pudo cambiar el estado. Verificá tu conexión.");
    }
  };

  const handleOpenEditDialog = (sesion: Sesion) => {
    setEditingSesion(sesion); // Keep a reference to the original session object
    setEditFormData({
        id: sesion.id,
        fechaInicio: format(parseISO(sesion.fechaHoraInicio), "yyyy-MM-dd"),
        horaInicio: format(parseISO(sesion.fechaHoraInicio), "HH:mm"),
        fechaFin: format(parseISO(sesion.fechaHoraFin), "yyyy-MM-dd"),
        horaFin: format(parseISO(sesion.fechaHoraFin), "HH:mm"),
        psicologoId: sesion.psicologo?.id || "",
        modalidadId: sesion.modalidad?.id || "",
        estadoId: sesion.estado?.id || "",
        enlaceVideollamada: sesion.enlaceVideollamada || "",
        pacientesIds: sesion.pacientes?.map(p => p.id) || [],
    });
    setEditPsicologoSearch(sesion.psicologo ? `${sesion.psicologo.persona.nombre} ${sesion.psicologo.persona.apellido}` : "");
    const initialPacientes = sesion.pacientes?.map(p => ({
        id: p.id,
        persona: {
            nombre: p.persona.nombre,
            apellido: p.persona.apellido,
            nombreCompleto: `${p.persona.nombre} ${p.persona.apellido}`
        }
    })) || [];
    setEditSelectedPacientes(initialPacientes);
    setEditPacienteSearch("");
    setEditFormErrors({});
    setIsEditPsicologoPopoverOpen(false);
    setIsEditPacientePopoverOpen(false);
    setEditPsicologoSearchResults([]); 
    setEditPacienteSearchResults([]);
    setIsEditDialogOpen(true);
};

const handleSelectEditPsicologo = (psicologo: Psicologo) => {
    setEditFormData({ ...editFormData, psicologoId: psicologo.id });
    setIsEditPsicologoPopoverOpen(false);
    setEditPsicologoSearch(psicologo.persona.nombreCompleto);
    setEditPsicologoSearchResults([]); 
};

const handleSelectEditPaciente = (paciente: Paciente) => {
    if (!editSelectedPacientes.some(p => p.id === paciente.id)) {
        const newSelectedPacientes = [...editSelectedPacientes, paciente];
        setEditSelectedPacientes(newSelectedPacientes);
        setEditFormData({ ...editFormData, pacientesIds: newSelectedPacientes.map(p => p.id) });
    }
    setEditPacienteSearch("");
    setIsEditPacientePopoverOpen(false);
};

const handleRemoveEditPaciente = (pacienteId: string) => {
    const newSelectedPacientes = editSelectedPacientes.filter(p => p.id !== pacienteId);
    setEditSelectedPacientes(newSelectedPacientes);
    setEditFormData({ ...editFormData, pacientesIds: newSelectedPacientes.map(p => p.id) });
};

const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editFormData.fechaInicio) errors.fechaInicio = "La fecha de inicio es requerida";
    if (!editFormData.horaInicio) errors.horaInicio = "La hora de inicio es requerida";
    if (!editFormData.fechaFin) errors.fechaFin = "La fecha de fin es requerida";
    if (!editFormData.horaFin) errors.horaFin = "La hora de fin es requerida";
    if (!editFormData.psicologoId) errors.psicologoId = "El psicólogo es requerido";
    if (!editFormData.modalidadId) errors.modalidadId = "La modalidad es requerida";
    if (!editFormData.estadoId) errors.estadoId = "El estado es requerido";
    if (!editFormData.pacientesIds || editFormData.pacientesIds.length === 0) errors.pacientesIds = "Debe seleccionar al menos un paciente";
    if (editFormData.fechaInicio && !esFechaHabil(editFormData.fechaInicio)) errors.fechaInicio = MENSAJE_DIA_NO_HABIL;
    if (editFormData.fechaFin && !esFechaHabil(editFormData.fechaFin)) errors.fechaFin = MENSAJE_DIA_NO_HABIL;
    
    const startDateTimeStr = `${editFormData.fechaInicio}T${editFormData.horaInicio}`;
    const endDateTimeStr = `${editFormData.fechaFin}T${editFormData.horaFin}`;
    if (editFormData.fechaInicio && editFormData.horaInicio && editFormData.fechaFin && editFormData.horaFin) {
        if (!errors.fechaFin && new Date(startDateTimeStr) >= new Date(endDateTimeStr)) {
            errors.fechaFin = "La fecha/hora de fin debe ser posterior"; 
            errors.horaFin = "a la fecha/hora de inicio"; 
        }
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
};

const handleUpdateSesion = async () => {
    if (!validateEditForm() || !editingSesion) return;
    setEditFormErrors({}); 

    try {
        setIsEditSubmitting(true);
        const fechaHoraInicio = new Date(`${editFormData.fechaInicio}T${editFormData.horaInicio}`);
        const fechaHoraFin = new Date(`${editFormData.fechaFin}T${editFormData.horaFin}`);

        // Reprogramado automático: si se cambió la fecha/hora y el usuario NO eligió otro estado
        // a mano, el turno pasa a "Reprogramada".
        const cambioFechaHora =
            fechaHoraInicio.toISOString() !== editingSesion.fechaHoraInicio ||
            fechaHoraFin.toISOString() !== editingSesion.fechaHoraFin;
        const estadoSinCambiarAMano = editFormData.estadoId === (editingSesion.estado?.id ?? "");
        const idReprogramada = estadoIdPorNombre("Reprogramada");
        let estadoIdFinal = parseInt(editFormData.estadoId);
        if (cambioFechaHora && estadoSinCambiarAMano && idReprogramada) {
            estadoIdFinal = parseInt(idReprogramada);
        }

        const payload = {
            fechaHoraInicio: fechaHoraInicio.toISOString(),
            fechaHoraFin: fechaHoraFin.toISOString(),
            psicologoId: parseInt(editFormData.psicologoId),
            modalidadId: parseInt(editFormData.modalidadId),
            estadoId: estadoIdFinal,
            enlaceVideollamada: esModalidadRemota(editFormData.modalidadId) ? editFormData.enlaceVideollamada.trim() || null : null,
            pacientesIds: editFormData.pacientesIds,
        };
        
        const response = await fetch(`/api/sesiones/${editingSesion.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            setIsEditDialogOpen(false);
            await loadInitialData(fechaHoraInicio);
            setEditingSesion(null); 
            avisoExito("Sesión actualizada correctamente.");
        } else {
            const errorData = await response.json();
            const newErrors: Record<string, string> = {};
            // Horario ocupado (RF 3.1): se muestra el motivo concreto
            let alertMessage = response.status === 409 && errorData.error ? errorData.error : "Error al actualizar la sesión.";

            if (errorData.details && Array.isArray(errorData.details)) {
                const generalErrorMessages: string[] = [];
                errorData.details.forEach((detail: any) => {
                    if (detail.path && detail.path.length > 0) {
                        newErrors[detail.path[0]] = detail.message;
                    } else if (detail.message) {
                        generalErrorMessages.push(detail.message);
                    }
                });
                if (generalErrorMessages.length > 0) {
                    newErrors.general = generalErrorMessages.join(' ');
                    alertMessage = `${alertMessage} ${newErrors.general}`;
                }
            } else if (errorData.error) {
                newErrors.general = errorData.error; 
                alertMessage = errorData.error;
            } else {
                newErrors.general = "Ocurrió un error desconocido.";
            }
            setEditFormErrors(newErrors);
            avisoError(alertMessage);
        }
    } catch (error) {
        console.error("Error updating session:", error);
        setEditFormErrors({ general: "Error de conexión o del cliente." });
        avisoError("No se pudo actualizar la sesión. Revisá la conexión y probá de nuevo.");
    } finally {
        setIsEditSubmitting(false);
    }
};

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre)
      setPermisos(userPermissions)

      const filteredMainModules = MODULOS_DISPONIBLES.filter((module) =>
        module.permisosRequeridos.some((pr) => userPermissions.includes(pr)),
      )
      setModulosPermitidos(filteredMainModules)
    }
  }, [session])

  // Se carga una sola vez por usuario (no cada vez que NextAuth entrega un objeto de sesión nuevo)
  useEffect(() => {
    if (session?.user) {
      loadInitialData()
    }
  }, [session?.user?.id])

  // Actualiza la lista de turnos sin la pantalla de "Cargando..." (no cierra nada ni cambia el día elegido)
  const recargarSesiones = async () => {
    const res = await fetch("/api/sesiones")
    if (res.ok) setSesiones(await res.json())
  }

  // Efecto para búsqueda de psicólogos con debounce
  useEffect(() => {
    if (psicologoSearchTimeout.current) {
      clearTimeout(psicologoSearchTimeout.current)
    }

    // Con el campo vacío trae a todos, así la lista aparece apenas se hace clic
    psicologoSearchTimeout.current = setTimeout(() => {
      searchPsicologos(psicologoSearch, setPsicologoSearchResults)
    }, 300)

    return () => {
      if (psicologoSearchTimeout.current) {
        clearTimeout(psicologoSearchTimeout.current)
      }
    }
  }, [psicologoSearch])

  // Efecto para búsqueda de pacientes con debounce
  useEffect(() => {
    if (pacienteSearchTimeout.current) {
      clearTimeout(pacienteSearchTimeout.current)
    }

    // Sin texto muestra los pacientes del psicólogo elegido; con texto busca entre todos
    if (pacienteSearch.trim().length > 1 || formData.psicologoId) {
      pacienteSearchTimeout.current = setTimeout(() => {
        searchPacientes(pacienteSearch, setPacienteSearchResults, formData.psicologoId)
      }, 300)
    } else {
      setPacienteSearchResults([])
    }

    return () => {
      if (pacienteSearchTimeout.current) {
        clearTimeout(pacienteSearchTimeout.current)
      }
    }
  }, [pacienteSearch, formData.psicologoId])

  const editPsicologoSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const editPacienteSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      if (editPsicologoSearchTimeout.current) {
          clearTimeout(editPsicologoSearchTimeout.current);
      }
      // Con el campo vacío trae a todos, así la lista aparece apenas se hace clic
      if (isEditDialogOpen) {
          editPsicologoSearchTimeout.current = setTimeout(() => {
              searchPsicologos(editPsicologoSearch, setEditPsicologoSearchResults);
          }, 300);
      }
      return () => {
          if (editPsicologoSearchTimeout.current) {
              clearTimeout(editPsicologoSearchTimeout.current);
          }
      };
  }, [editPsicologoSearch, isEditDialogOpen]);

  useEffect(() => {
      if (editPacienteSearchTimeout.current) {
          clearTimeout(editPacienteSearchTimeout.current);
      }
      // Sin texto muestra los pacientes del psicólogo elegido; con texto busca entre todos
      if (isEditDialogOpen && (editPacienteSearch.trim().length > 1 || editFormData.psicologoId)) {
          editPacienteSearchTimeout.current = setTimeout(() => {
              searchPacientes(editPacienteSearch, setEditPacienteSearchResults, editFormData.psicologoId);
          }, 300);
      } else if (isEditDialogOpen) { // Important: only clear if dialog is open
          setEditPacienteSearchResults([]);
      }
      return () => {
          if (editPacienteSearchTimeout.current) {
              clearTimeout(editPacienteSearchTimeout.current);
          }
      };
  }, [editPacienteSearch, isEditDialogOpen, editFormData.psicologoId]);
  
  // Agregar este useEffect después de los otros useEffect existentes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (
          !target.closest("#create-psicologo-popover-wrapper") &&
          !target.closest("#create-paciente-popover-wrapper") &&
          !target.closest("#edit-psicologo-popover-wrapper") &&
          !target.closest("#edit-paciente-popover-wrapper")
      ) {
          setIsPsicologoPopoverOpen(false);
          setIsPacientePopoverOpen(false);
          setIsEditPsicologoPopoverOpen(false);
          setIsEditPacientePopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // fechaAMostrar: día que queda seleccionado después de crear o editar un turno, para que se vea
  const loadInitialData = async (fechaAMostrar?: Date) => {
    try {
      setLoading(true)

      // Cargar sesiones
      const sesionesResponse = await fetch("/api/sesiones")
      if (sesionesResponse.ok) {
        const sesionesData = await sesionesResponse.json()
        setSesiones(sesionesData)

        // Si hay sesiones para hoy, mantener la fecha actual seleccionada
        // Si no, buscar la primera sesión disponible y seleccionar esa fecha
        const today = new Date()
        const sesionesHoy = sesionesData.filter((sesion: { fechaHoraInicio: string }) => isSameDay(parseISO(sesion.fechaHoraInicio), today))

        if (fechaAMostrar) {
          setSelectedDate(fechaAMostrar)
        } else if (sesionesHoy.length === 0 && sesionesData.length > 0) {
          // Ordenar sesiones por fecha
          const sesionesOrdenadas = [...sesionesData].sort(
            (a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime(),
          )

          // Encontrar la primera sesión futura
          const sesionFutura = sesionesOrdenadas.find((sesion) => new Date(sesion.fechaHoraInicio) >= today)

          if (sesionFutura) {
            setSelectedDate(parseISO(sesionFutura.fechaHoraInicio))
          }
        }
      }

      // Cargar datos para formularios
      const [modalidadesRes, estadosRes, mediosRes] = await Promise.all([
        fetch("/api/modalidades"),
        fetch("/api/estados"),
        fetch("/api/medios-de-pago"),
      ])

      if (mediosRes.ok) {
        setMediosDePago(await mediosRes.json())
      }

      if (modalidadesRes.ok) {
        const modalidadesData = await modalidadesRes.json()
        setModalidades(modalidadesData)
      }

      if (estadosRes.ok) {
        const estadosData = await estadosRes.json()
        setEstados(estadosData)
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const searchPsicologos = async (query: string, setSearchResults: React.Dispatch<React.SetStateAction<Psicologo[]>>) => {
    try {
      const response = await fetch(`/api/psicologos/buscar?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Error searching psychologists:", error)
      setSearchResults([])
    }
  }

  const searchPacientes = async (
    query: string,
    setSearchResults: React.Dispatch<React.SetStateAction<Paciente[]>>,
    psicologoId?: string,
  ) => {
    try {
      if (query.trim().length < 2 && !psicologoId) {
        setSearchResults([])
        return
      }

      const params = new URLSearchParams({ q: query.trim() })
      if (psicologoId) params.set("psicologoId", psicologoId)
      const response = await fetch(`/api/pacientes/buscar?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Error searching patients:", error)
      setSearchResults([])
    }
  }

  const handleLogout = async () => {
    await cerrarSesion()
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const navigateToModule = (ruta: string) => {
    router.push(ruta)
    setIsMenuOpen(false)
  }

  const handleSelectPsicologo = (psicologo: Psicologo) => {
    setFormData({
      ...formData,
      psicologoId: psicologo.id,
    })
    setIsPsicologoPopoverOpen(false)
    setPsicologoSearch(psicologo.persona.nombreCompleto)
  }

  const handleSelectPaciente = (paciente: Paciente) => {
    // Verificar si el paciente ya está seleccionado
    if (!selectedPacientes.some((p) => p.id === paciente.id)) {
      const newSelectedPacientes = [...selectedPacientes, paciente]
      setSelectedPacientes(newSelectedPacientes)
      setFormData({
        ...formData,
        pacientesIds: newSelectedPacientes.map((p) => p.id),
      })
    }
    setPacienteSearch("")
  }

  const handleRemovePaciente = (pacienteId: string) => {
    const newSelectedPacientes = selectedPacientes.filter((p) => p.id !== pacienteId)
    setSelectedPacientes(newSelectedPacientes)
    setFormData({
      ...formData,
      pacientesIds: newSelectedPacientes.map((p) => p.id),
    })
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.fechaInicio) errors.fechaInicio = "La fecha de inicio es requerida"
    if (!formData.horaInicio) errors.horaInicio = "La hora de inicio es requerida"
    if (!formData.fechaFin) errors.fechaFin = "La fecha de fin es requerida"
    if (!formData.horaFin) errors.horaFin = "La hora de fin es requerida"
    if (!formData.psicologoId) errors.psicologoId = "El psicólogo es requerido"
    if (!formData.modalidadId) errors.modalidadId = "La modalidad es requerida"
    if (!formData.estadoId) errors.estadoId = "El estado es requerido"
    if (formData.pacientesIds.length === 0) errors.pacientesIds = "Debe seleccionar al menos un paciente"
    if (formData.fechaInicio && !esFechaHabil(formData.fechaInicio)) errors.fechaInicio = MENSAJE_DIA_NO_HABIL
    if (formData.fechaFin && !esFechaHabil(formData.fechaFin)) errors.fechaFin = MENSAJE_DIA_NO_HABIL

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateSesion = async () => {
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const fechaHoraInicio = new Date(`${formData.fechaInicio}T${formData.horaInicio}`)
      const fechaHoraFin = new Date(`${formData.fechaFin}T${formData.horaFin}`)

      const response = await fetch("/api/sesiones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fechaHoraInicio: fechaHoraInicio.toISOString(),
          fechaHoraFin: fechaHoraFin.toISOString(),
          psicologoId: formData.psicologoId,
          modalidadId: formData.modalidadId,
          estadoId: formData.estadoId,
          enlaceVideollamada: esModalidadRemota(formData.modalidadId) ? formData.enlaceVideollamada.trim() || null : null,
          pacientesIds: formData.pacientesIds,
        }),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)

        // Recargar y quedarse en el día del turno nuevo, para que se vea (con su enlace, si es remoto)
        await loadInitialData(fechaHoraInicio)

        // Reset form
        setFormData({
          fechaInicio: format(proximoDiaHabil(new Date()), "yyyy-MM-dd"),
          horaInicio: "09:00",
          fechaFin: format(proximoDiaHabil(new Date()), "yyyy-MM-dd"),
          horaFin: "10:00",
          psicologoId: "",
          modalidadId: "",
          estadoId: "",
          enlaceVideollamada: "",
          pacientesIds: [],
        })
        setSelectedPacientes([])
        setPsicologoSearch("")
        setPacienteSearch("")
      } else {
        const errorData = await response.json()
        if (errorData.details) {
          setFormErrors(errorData.details)
          // Horario ocupado (RF 3.1): además del error en el campo, se avisa arriba
          if (response.status === 409) avisoError(errorData.error)
        } else {
          avisoError("Error al crear la sesión: " + errorData.error)
        }
      }
    } catch (error) {
      console.error("Error creating session:", error)
      avisoError("Error al crear la sesión. Por favor, intente nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSesionesForDate = (date: Date, filterType: "all" | "psicologo" | "paciente") => {
    return sesiones.filter((sesion) => {
      const sesionDate = parseISO(sesion.fechaHoraInicio)
      const isSameDate = isSameDay(sesionDate, date)

      if (!isSameDate) return false

      if (filterType === "psicologo") {
        // Solo mostrar sesiones donde el usuario es el psicólogo
        return sesion.psicologo?.id === session?.user?.psicologoId
      }

      if (filterType === "paciente") {
        // Solo mostrar sesiones donde el usuario es paciente
        return sesion.pacientes?.some((p) => p.id === session?.user?.pacienteId)
      }

      return true // 'all' - mostrar todas las sesiones (para administradores)
    })
  }

  const renderCalendarWithSessions = (filterType: "all" | "psicologo" | "paciente") => {
    // Días que tienen al menos un turno visible para esta vista: se marcan con un punto en el calendario
    const diasConTurno = sesiones
      .filter((sesion) => {
        if (filterType === "psicologo") return sesion.psicologo?.id === session?.user?.psicologoId
        if (filterType === "paciente") return sesion.pacientes?.some((p) => p.id === session?.user?.pacienteId)
        return true
      })
      .map((sesion) => parseISO(sesion.fechaHoraInicio))

    return (
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          modifiers={{ conTurno: diasConTurno }}
          modifiersClassNames={{
            conTurno:
              // Punto dorado; en el día de hoy (fondo dorado) va oscuro para que se vea
              "relative after:pointer-events-none after:absolute after:bottom-0.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[today=true]:after:bg-background",
          }}
          // En "Registrar Sesiones" no se pueden elegir sábados ni domingos
          disabled={filterType === "all" ? { dayOfWeek: DIAS_NO_HABILES } : undefined}
          onSelect={(date) => {
            if (date) {
              setSelectedDate(date)
              // When a date is selected, we don't need to do anything else here
              // as the UI will re-render with the filtered sessions for the selected date
            }
          }}
          className="self-center rounded-md border lg:self-start"
          style={{ backgroundColor: "var(--background)", borderRadius: "8px", padding: "10px" }}
          locale={es}
        />

        <div className="w-full min-w-0 space-y-2">
          <h4 className="font-semibold text-foreground">
            Sesiones para {format(selectedDate, "dd/MM/yyyy", { locale: es })}
          </h4>
          <div className="space-y-3">
            {getSesionesForDate(selectedDate, filterType).map((sesion) => (
              <Card key={sesion.id} className="p-3" style={{ backgroundColor: "var(--background)" }}>
                <div className="flex items-start justify-between"> {/* items-start for alignment */}
                    <div className="space-y-1 flex-grow"> {/* This div wraps the session details */}
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" style={{ color: "var(--dorado)" }} />
                            <span className="text-sm text-foreground">
                                {format(parseISO(sesion.fechaHoraInicio), "HH:mm")} -{" "}
                                {format(parseISO(sesion.fechaHoraFin), "HH:mm")}
                            </span>
                        </div>
                        {sesion.psicologo && (
                            <div className="flex items-center space-x-2">
                                <Brain className="w-4 h-4 text-info" />
                                <span className="text-sm text-suave">
                                    Psicóloga/o {sesion.psicologo.persona.nombre} {sesion.psicologo.persona.apellido}
                                </span>
                            </div>
                        )}
                        {sesion.modalidad && (
                            <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-exito" />
                                <span className="text-sm text-suave">{sesion.modalidad.nombre}</span>
                            </div>
                        )}
                        {sesion.enlaceVideollamada && sesion.estado?.nombre !== "Cancelada" && sesion.estado?.nombre !== "Finalizada" && (
                            <div className="flex items-center space-x-2">
                                <Video className="w-4 h-4 text-info" />
                                <a
                                    href={sesion.enlaceVideollamada}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-info underline hover:text-info"
                                >
                                    Unirse a la videollamada
                                </a>
                            </div>
                        )}
                        {sesion.estado && (
                            <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4 text-naranja" />
                                <Badge variant="outline" className={cn("text-xs", colorEstado(sesion.estado.nombre))}>
                                    {sesion.estado.nombre}
                                </Badge>
                            </div>
                        )}
                        {sesion.pacientes && sesion.pacientes.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-suave">
                                    {sesion.pacientes.map((p) => `${p.persona.nombre} ${p.persona.apellido}`).join(", ")}
                                </span>
                            </div>
                        )}
                        {sesion.pago && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Wallet className="w-4 h-4 text-aviso" />
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-xs",
                                        sesion.pago.estado === "Pagado"
                                            ? "border-emerald-500 text-exito"
                                            : "border-amber-400 text-aviso",
                                    )}
                                >
                                    {sesion.pago.estado}
                                </Badge>
                                {sesion.pago.estado === "Pagado" && (
                                    <span className="text-sm text-suave">
                                        {sesion.pago.medio?.descripcion}
                                        {sesion.pago.monto != null &&
                                            ` · $ ${sesion.pago.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Acciones del turno: fila con texto, debajo de los datos */}
                {(() => {
                    const cerrada = sesion.estado?.nombre === "Finalizada" || sesion.estado?.nombre === "Cancelada"
                    const puedeEditar = permisos.includes("Editar Sesión") && !cerrada
                    const verPago = !!sesion.pago && sesion.estado?.nombre !== "Cancelada"
                    // RF 4.3 - El paciente puede mover su turno con al menos 24 h de anticipación
                    const puedeReprogramar =
                        filterType === "paciente" && !cerrada &&
                        parseISO(sesion.fechaHoraInicio).getTime() - Date.now() >= 24 * 60 * 60 * 1000
                    if (!puedeEditar && !verPago && !puedeReprogramar) return null
                    const claseBoton = "h-8 gap-1.5 rounded-full border bg-transparent px-3 text-sm font-medium"
                    return (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-borde/60 pt-3">
                            {puedeEditar && sesion.estado?.nombre !== "Confirmada" && (
                                <Button
                                    variant="outline"
                                    onClick={() => cambiarEstadoSesion(sesion, "Confirmada")}
                                    className={cn(claseBoton, "border-emerald-500/60 text-exito hover:bg-emerald-500/15 hover:text-exito")}
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    Confirmar
                                </Button>
                            )}
                            {puedeEditar && (
                                <Button
                                    variant="outline"
                                    onClick={() => cambiarEstadoSesion(sesion, "Cancelada")}
                                    className={cn(claseBoton, "border-red-500/60 text-peligro hover:bg-red-500/15 hover:text-peligro")}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancelar
                                </Button>
                            )}
                            {verPago && (
                                <Button
                                    variant="outline"
                                    onClick={() => setSesionPago(sesion)}
                                    className={cn(claseBoton, "border-amber-400/60 text-aviso hover:bg-amber-400/15 hover:text-aviso")}
                                >
                                    <Wallet className="h-3.5 w-3.5" />
                                    Pago
                                </Button>
                            )}
                            {puedeReprogramar && (
                                <Button
                                    variant="outline"
                                    onClick={() => setSesionReprogramar(sesion)}
                                    className={cn(claseBoton, "border-orange-400/60 text-naranja hover:bg-orange-400/15 hover:text-naranja")}
                                >
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Reprogramar
                                </Button>
                            )}
                            {puedeEditar && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleOpenEditDialog(sesion)}
                                    className={cn(claseBoton, "border-borde-fuerte/60 text-texto-2 hover:bg-foreground/10 hover:text-foreground")}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                </Button>
                            )}
                        </div>
                    )
                })()}
              </Card>
            ))}
            {getSesionesForDate(selectedDate, filterType).length === 0 && (
              <p className="text-tenue text-sm text-center py-4">
                No hay sesiones programadas para esta fecha. Los días con turnos están marcados con un punto en el calendario.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: "var(--background)" }}>
            <Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" />
            <TypographyP className="text-foreground">Cargando...</TypographyP>
        </div>
    )
  }

  if (!session) {
    return null
  }

  const nombreCompleto = session.user.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session.user.email || "Usuario"

  const puedeRegistrarSesiones = permisos.includes("Registrar Sesión")
  const puedeVerSesiones = permisos.includes("Ver Sesiones")
  const puedeAsignarProfesional = permisos.includes("Asignar Profesional")

  const defaultTabValue = puedeRegistrarSesiones
  ? "registrar"
  : session?.user?.psicologoId
  ? "psicologo"
  : session?.user?.pacienteId
  ? "paciente"
  : undefined;

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <EncabezadoPagina titulo="Gestión de Sesiones" descripcion="Turnos presenciales y por videollamada: agenda, estados y pagos." volverA="/welcome" textoVolver="Volver al inicio" />

        {puedeVerSesiones ? (
          <Tabs
            defaultValue={defaultTabValue}
            className="w-full"
            onValueChange={(value) => {
              // When changing tabs, we keep the same selected date
              // This ensures consistency across different views
            }}
          >
            <TabsList className="mb-2 flex w-full max-w-full justify-start overflow-x-auto sm:w-fit">
              {puedeRegistrarSesiones && (
                <TabsTrigger
                  value="registrar"
                  className="shrink-0 px-4 sm:px-6"
                >
                  Registrar Sesiones
                </TabsTrigger>
              )}
              {session?.user?.psicologoId && (
              <TabsTrigger
                value="psicologo"
                className="shrink-0 px-4 sm:px-6"
              >
                Mis Sesiones (Psicólogo)
              </TabsTrigger>
              )}
              {session?.user?.pacienteId && (
              <TabsTrigger
                value="paciente"
                className="shrink-0 px-4 sm:px-6"
              >
                Mis Sesiones (Paciente)
              </TabsTrigger>
              )}
            </TabsList>

            {puedeRegistrarSesiones && (
              <TabsContent value="registrar" className="space-y-4">
                <Card style={{ backgroundColor: "var(--card)" }}>
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center space-x-2">
                      <Plus className="w-5 h-5" style={{ color: "var(--dorado)" }} />
                      <span>Calendario de Registro de Sesiones</span>
                    </CardTitle>
                    <CardDescription className="text-suave">
                      Selecciona una fecha para programar una nueva sesión
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                      <div className="min-w-0 flex-1">{renderCalendarWithSessions("all")}</div>
                      <div className="order-first lg:order-last lg:flex-shrink-0">
                        <Dialog
                          open={isCreateDialogOpen}
                          onOpenChange={(abierto) => {
                            if (abierto && esDiaHabil(selectedDate)) {
                              const dia = format(selectedDate, "yyyy-MM-dd")
                              setFormData((prev) => ({ ...prev, fechaInicio: dia, fechaFin: dia }))
                              setFormErrors({})
                            }
                            setIsCreateDialogOpen(abierto)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="w-full" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                              <Plus className="w-4 h-4 mr-2" />
                              Nueva Sesión
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6"
                            style={{ backgroundColor: "var(--card)", border: "1px solid var(--dorado)" }}
                          >
                            <DialogHeader>
                              <DialogTitle className="text-foreground">Registrar Nueva Sesión</DialogTitle>
                              <DialogDescription className="text-suave">
                                Complete los datos para programar una nueva sesión.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="fechaInicio" className="text-foreground">
                                    Fecha Inicio
                                  </Label>
                                  <Input
                                    id="fechaInicio"
                                    type="date"
                                    value={formData.fechaInicio}
                                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.fechaInicio && "border-red-500",
                                    )}
                                  />
                                  {formErrors.fechaInicio && (
                                    <p className="text-sm text-peligro">{formErrors.fechaInicio}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="horaInicio" className="text-foreground">
                                    Hora Inicio
                                  </Label>
                                  <Input
                                    id="horaInicio"
                                    type="time"
                                    value={formData.horaInicio}
                                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.horaInicio && "border-red-500",
                                    )}
                                  />
                                  {formErrors.horaInicio && (
                                    <p className="text-sm text-peligro">{formErrors.horaInicio}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="fechaFin" className="text-foreground">
                                    Fecha Fin
                                  </Label>
                                  <Input
                                    id="fechaFin"
                                    type="date"
                                    value={formData.fechaFin}
                                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.fechaFin && "border-red-500",
                                    )}
                                  />
                                  {formErrors.fechaFin && <p className="text-sm text-peligro">{formErrors.fechaFin}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="horaFin" className="text-foreground">
                                    Hora Fin
                                  </Label>
                                  <Input
                                    id="horaFin"
                                    type="time"
                                    value={formData.horaFin}
                                    onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.horaFin && "border-red-500",
                                    )}
                                  />
                                  {formErrors.horaFin && <p className="text-sm text-peligro">{formErrors.horaFin}</p>}
                                </div>
                              </div>

                              {/* Psicólogo con búsqueda */}
                              <div className="space-y-2">
                                <Label htmlFor="psicologo_search_create_input" className="text-foreground">
                                  Psicólogo
                                </Label>
                                <div id="create-psicologo-popover-wrapper" className="relative">
                                  <Input
                                    id="psicologo_search_create_input" 
                                    type="text"
                                    placeholder="Buscar psicólogo..."
                                    value={psicologoSearch}
                                    onChange={(e) => setPsicologoSearch(e.target.value)}
                                    onFocus={() => {
                                      setIsPsicologoPopoverOpen(true)
                                      if (formData.psicologoId) searchPsicologos("", setPsicologoSearchResults)
                                    }}
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.psicologoId && "border-red-500",
                                    )}
                                  />
                                  {isPsicologoPopoverOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-borde-fuerte rounded-md shadow-lg max-h-60 overflow-auto">
                                      {psicologoSearchResults.length > 0 ? (
                                        psicologoSearchResults.map((psicologo) => (
                                          <div
                                            key={psicologo.id}
                                            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-background text-foreground border-b border-borde last:border-b-0"
                                            onClick={() => handleSelectPsicologo(psicologo)}
                                          >
                                            <Check
                                              className={cn(
                                                "h-4 w-4 shrink-0",
                                                formData.psicologoId === psicologo.id ? "opacity-100" : "opacity-0",
                                              )}
                                            />
                                            <div className="flex min-w-0 flex-col">
                                              <span>{psicologo.persona.nombreCompleto}</span>
                                              {psicologo.especialidad && (
                                                <span className="text-sm text-info">{psicologo.especialidad}</span>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="px-3 py-6 text-center text-sm text-tenue">
                                          No se encontraron psicólogos
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {formErrors.psicologoId && (
                                  <p className="text-sm text-peligro">{formErrors.psicologoId}</p>
                                )}
                              </div>

                              {/* Modalidad */}
                              <div className="space-y-2">
                                <Label htmlFor="modalidad" className="text-foreground">
                                  Modalidad
                                </Label>
                                <Select
                                  value={formData.modalidadId}
                                  onValueChange={(value) => setFormData({ ...formData, modalidadId: value })}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.modalidadId && "border-red-500",
                                    )}
                                  >
                                    <SelectValue placeholder="Seleccionar modalidad" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-card text-foreground border-borde-fuerte">
                                    {modalidades.map((modalidad) => (
                                      <SelectItem key={modalidad.id} value={modalidad.id} className="text-foreground">
                                        {modalidad.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {formErrors.modalidadId && (
                                  <p className="text-sm text-peligro">{formErrors.modalidadId}</p>
                                )}
                              </div>

                              {/* Enlace de videollamada (RF 3.4): solo para sesiones remotas */}
                              {esModalidadRemota(formData.modalidadId) && (
                                <div className="space-y-2">
                                  <Label htmlFor="enlaceVideollamada" className="text-foreground">
                                    Enlace de videollamada
                                  </Label>
                                  <Input
                                    id="enlaceVideollamada"
                                    type="url"
                                    placeholder="Se genera solo si lo dejás vacío"
                                    value={formData.enlaceVideollamada}
                                    onChange={(e) => setFormData({ ...formData, enlaceVideollamada: e.target.value })}
                                    className="bg-background text-foreground border-borde-fuerte"
                                  />
                                  <p className="text-sm text-tenue">Si lo dejás vacío, MemoPsy crea el enlace automáticamente. Si ya tenés uno, pegalo acá.</p>
                                </div>
                              )}

                              {/* Estado */}
                              <div className="space-y-2">
                                <Label htmlFor="estado" className="text-foreground">
                                  Estado
                                </Label>
                                <Select
                                  value={formData.estadoId}
                                  onValueChange={(value) => setFormData({ ...formData, estadoId: value })}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "bg-background text-foreground border-borde-fuerte",
                                      formErrors.estadoId && "border-red-500",
                                    )}
                                  >
                                    <SelectValue placeholder="Seleccionar estado" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-card text-foreground border-borde-fuerte">
                                    {estados.map((estado) => (
                                      <SelectItem key={estado.id} value={estado.id} className="text-foreground">
                                        {estado.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {formErrors.estadoId && <p className="text-sm text-peligro">{formErrors.estadoId}</p>}
                              </div>

                              {/* Pacientes con búsqueda y selección múltiple */}
                              <div className="space-y-2">
                                <Label htmlFor="paciente_search_create_input" className="text-foreground">
                                  Pacientes
                                </Label>
                                <div
                                  className={cn(
                                    "min-h-10 p-2 rounded-md border bg-background text-foreground w-full",
                                    formErrors.pacientesIds && "border-red-500",
                                    !formErrors.pacientesIds && "border-borde-fuerte",
                                  )}
                                >
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedPacientes.map((paciente) => (
                                      <Badge
                                        key={paciente.id}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                      >
                                        {paciente.persona.nombreCompleto}
                                        <button
                                          type="button"
                                          className="ml-1 rounded-full outline-none"
                                          onClick={() => handleRemovePaciente(paciente.id)}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  <div id="create-paciente-popover-wrapper" className="relative"> 
                                    <Input
                                      id="paciente_search_create_input"
                                      type="text"
                                      placeholder="Buscar pacientes..."
                                      value={pacienteSearch}
                                      onChange={(e) => setPacienteSearch(e.target.value)}
                                      onFocus={() => setIsPacientePopoverOpen(true)}
                                      className="bg-transparent border-0 text-foreground placeholder:text-tenue focus:ring-0 focus:outline-none p-0 w-full"
                                    />
                                    {isPacientePopoverOpen && (
                                      <div className="absolute z-50 w-full mt-1 bg-card border border-borde-fuerte rounded-md shadow-lg max-h-60 overflow-auto">
                                        {pacienteSearchResults.length > 0 && pacienteSearch.trim().length < 2 && (
                                          <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-tenue">
                                            Pacientes de este psicólogo
                                          </div>
                                        )}
                                        {pacienteSearchResults.length > 0 ? (
                                          pacienteSearchResults.map((paciente) => (
                                            <div
                                              key={paciente.id}
                                              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-background text-foreground border-b border-borde last:border-b-0"
                                              onClick={() => handleSelectPaciente(paciente)}
                                            >
                                              <Check
                                                className={cn(
                                                  "h-4 w-4",
                                                  selectedPacientes.some((p) => p.id === paciente.id)
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                                )}
                                              />
                                              <span>{paciente.persona.nombreCompleto}</span>
                                              {paciente.esDelPsicologo && pacienteSearch.trim().length > 1 && (
                                                <span className="ml-auto text-sm text-info">Su paciente</span>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="px-3 py-6 text-center text-sm text-tenue">
                                            {pacienteSearch.trim().length > 1
                                              ? "No se encontraron pacientes"
                                              : formData.psicologoId
                                                ? "Este psicólogo todavía no tiene pacientes. Escribe para buscar."
                                                : "Elige un psicólogo para ver sus pacientes, o escribe para buscar"}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {formErrors.pacientesIds && (
                                  <p className="text-sm text-peligro">{formErrors.pacientesIds}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                                className="w-full border-borde-fuerte text-suave sm:w-auto"
                                disabled={isSubmitting}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleCreateSesion}
                                className="w-full sm:w-auto"
                                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? "Creando..." : "Crear Sesión"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {session?.user?.psicologoId && (
            <TabsContent value="psicologo" className="space-y-4">
              <Card style={{ backgroundColor: "var(--card)" }}>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center space-x-2">
                    <Brain className="w-5 h-5" style={{ color: "var(--dorado)" }} />
                    <span>Mis Sesiones como Psicólogo</span>
                  </CardTitle>
                  <CardDescription className="text-suave">
                    Sesiones donde figuras como psicólogo asignado
                  </CardDescription>
                  <Button
                    variant="outline"
                    onClick={() => setHorariosAbierto(true)}
                    className="mt-2 w-full gap-2 border-dorado/60 text-dorado hover:bg-primary/10 sm:w-fit"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Horarios para reprogramar
                  </Button>
                </CardHeader>
                <CardContent>{renderCalendarWithSessions("psicologo")}</CardContent>
              </Card>
            </TabsContent>
            )}
            {session?.user?.pacienteId && (
            <TabsContent value="paciente" className="space-y-4">
              <Card style={{ backgroundColor: "var(--card)" }}>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center space-x-2">
                    <User className="w-5 h-5" style={{ color: "var(--dorado)" }} />
                    <span>Mis Sesiones como Paciente</span>
                  </CardTitle>
                  <CardDescription className="text-suave">Sesiones donde figuras como paciente</CardDescription>
                </CardHeader>
                <CardContent>{renderCalendarWithSessions("paciente")}</CardContent>
              </Card>
            </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
              <CalendarIcon className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--dorado)" }} />
              <h3 className="text-2xl font-semibold text-foreground mb-4">Sin Acceso a Sesiones</h3>
              <p className="text-suave">
                No tenés los permisos necesarios para ver las sesiones. Si creés que es un error,
                consultá con el administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </main>

    {/* Edit Sesion Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) { 
            setEditPsicologoSearch("");
            setEditPacienteSearch("");
            setEditPsicologoSearchResults([]);
            setEditPacienteSearchResults([]);
            const originalPacientes = editingSesion?.pacientes?.map(p => ({
                id: p.id,
                persona: {
                    nombre: p.persona.nombre,
                    apellido: p.persona.apellido,
                    nombreCompleto: `${p.persona.nombre} ${p.persona.apellido}`
                }
            })) || [];
            setEditSelectedPacientes(originalPacientes);
            if (editingSesion) {
                 setEditFormData({
                    id: editingSesion.id,
                    fechaInicio: format(parseISO(editingSesion.fechaHoraInicio), "yyyy-MM-dd"),
                    horaInicio: format(parseISO(editingSesion.fechaHoraInicio), "HH:mm"),
                    fechaFin: format(parseISO(editingSesion.fechaHoraFin), "yyyy-MM-dd"),
                    horaFin: format(parseISO(editingSesion.fechaHoraFin), "HH:mm"),
                    psicologoId: editingSesion.psicologo?.id || "",
                    modalidadId: editingSesion.modalidad?.id || "",
                    estadoId: editingSesion.estado?.id || "",
                    enlaceVideollamada: editingSesion.enlaceVideollamada || "",
                    pacientesIds: originalPacientes.map(p => p.id),
                });
            }
            setEditFormErrors({});
        }
        setIsEditDialogOpen(isOpen);
    }}>
        <DialogContent className="max-h-[90dvh] p-4 sm:max-w-[500px] sm:p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--dorado)" }}>
            <DialogHeader>
                <DialogTitle className="text-foreground">Editar Sesión</DialogTitle>
                <DialogDescription className="text-suave">
                    Modifique los datos de la sesión.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {/* Fecha Inicio y Hora Inicio */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit_fechaInicio" className="text-foreground">Fecha Inicio</Label>
                        <Input id="edit_fechaInicio" type="date" value={editFormData.fechaInicio} onChange={(e) => setEditFormData({ ...editFormData, fechaInicio: e.target.value })} className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.fechaInicio && "border-red-500")} />
                        {editFormErrors.fechaInicio && <p className="text-sm text-peligro">{editFormErrors.fechaInicio}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit_horaInicio" className="text-foreground">Hora Inicio</Label>
                        <Input id="edit_horaInicio" type="time" value={editFormData.horaInicio} onChange={(e) => setEditFormData({ ...editFormData, horaInicio: e.target.value })} className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.horaInicio && "border-red-500")} />
                        {editFormErrors.horaInicio && <p className="text-sm text-peligro">{editFormErrors.horaInicio}</p>}
                    </div>
                </div>
                {/* Fecha Fin y Hora Fin */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit_fechaFin" className="text-foreground">Fecha Fin</Label>
                        <Input id="edit_fechaFin" type="date" value={editFormData.fechaFin} onChange={(e) => setEditFormData({ ...editFormData, fechaFin: e.target.value })} className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.fechaFin && "border-red-500")} />
                        {editFormErrors.fechaFin && <p className="text-sm text-peligro">{editFormErrors.fechaFin}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit_horaFin" className="text-foreground">Hora Fin</Label>
                        <Input id="edit_horaFin" type="time" value={editFormData.horaFin} onChange={(e) => setEditFormData({ ...editFormData, horaFin: e.target.value })} className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.horaFin && "border-red-500")} />
                        {editFormErrors.horaFin && <p className="text-sm text-peligro">{editFormErrors.horaFin}</p>}
                    </div>
                </div>

                {/* Psicólogo con búsqueda (Edit) */}
                <div className="space-y-2">
                    <Label htmlFor="edit_psicologo_search_input" className="text-foreground">Psicólogo</Label>
                    <div id="edit-psicologo-popover-wrapper" className="relative">
                        <Input
                            id="edit_psicologo_search_input"
                            type="text" placeholder="Buscar psicólogo..."
                            value={editPsicologoSearch}
                            onChange={(e) => setEditPsicologoSearch(e.target.value)}
                            onFocus={() => {
                                setIsEditPsicologoPopoverOpen(true);
                                if (editFormData.psicologoId) searchPsicologos("", setEditPsicologoSearchResults);
                            }}
                            className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.psicologoId && "border-red-500")}
                        />
                        {isEditPsicologoPopoverOpen && (
                            <div className="absolute z-[60] w-full mt-1 bg-card border border-borde-fuerte rounded-md shadow-lg max-h-60 overflow-auto">
                                {editPsicologoSearchResults.length > 0 ? (
                                    editPsicologoSearchResults.map((psicologo) => (
                                        <div key={psicologo.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-background text-foreground border-b border-borde last:border-b-0" onClick={() => handleSelectEditPsicologo(psicologo)}>
                                            <Check className={cn("h-4 w-4 shrink-0", editFormData.psicologoId === psicologo.id ? "opacity-100" : "opacity-0")} />
                                            <div className="flex min-w-0 flex-col">
                                                <span>{psicologo.persona.nombreCompleto}</span>
                                                {psicologo.especialidad && (
                                                    <span className="text-sm text-info">{psicologo.especialidad}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : ( <div className="px-3 py-6 text-center text-sm text-tenue">No se encontraron psicólogos.</div> )}
                            </div>
                        )}
                    </div>
                    {editFormErrors.psicologoId && <p className="text-sm text-peligro">{editFormErrors.psicologoId}</p>}
                </div>

                {/* Modalidad (Edit) */}
                <div className="space-y-2">
                    <Label htmlFor="edit_modalidad_trigger" className="text-foreground">Modalidad</Label>
                    <Select value={editFormData.modalidadId} onValueChange={(value) => setEditFormData({ ...editFormData, modalidadId: value })}>
                        <SelectTrigger id="edit_modalidad_trigger" className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.modalidadId && "border-red-500")}>
                            <SelectValue placeholder="Seleccionar modalidad" />
                        </SelectTrigger>
                        <SelectContent className="bg-card text-foreground border-borde-fuerte z-[60]">
                            {modalidades.map((modalidad) => (
                                <SelectItem key={modalidad.id} value={modalidad.id} className="text-foreground hover:bg-background">{modalidad.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {editFormErrors.modalidadId && <p className="text-sm text-peligro">{editFormErrors.modalidadId}</p>}
                </div>

                {/* Enlace de videollamada (RF 3.4): solo para sesiones remotas */}
                {esModalidadRemota(editFormData.modalidadId) && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_enlaceVideollamada" className="text-foreground">Enlace de videollamada</Label>
                    <Input
                      id="edit_enlaceVideollamada"
                      type="url"
                      placeholder="Se genera solo si lo dejás vacío"
                      value={editFormData.enlaceVideollamada}
                      onChange={(e) => setEditFormData({ ...editFormData, enlaceVideollamada: e.target.value })}
                      className="bg-background text-foreground border-borde-fuerte"
                    />
                    <p className="text-sm text-tenue">Si lo dejás vacío, MemoPsy crea el enlace automáticamente. Si ya tenés uno, pegalo acá.</p>
                  </div>
                )}

                {/* Estado (Edit) */}
                <div className="space-y-2">
                    <Label htmlFor="edit_estado_trigger" className="text-foreground">Estado</Label>
                    <Select value={editFormData.estadoId} onValueChange={(value) => setEditFormData({ ...editFormData, estadoId: value })}>
                        <SelectTrigger id="edit_estado_trigger" className={cn("bg-background text-foreground border-borde-fuerte w-full", editFormErrors.estadoId && "border-red-500")}>
                            <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-card text-foreground border-borde-fuerte z-[60]">
                            {estados.map((estado) => (
                                <SelectItem key={estado.id} value={estado.id} className="text-foreground hover:bg-background">{estado.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {editFormErrors.estadoId && <p className="text-sm text-peligro">{editFormErrors.estadoId}</p>}
                </div>

                {/* Pacientes con búsqueda y selección múltiple (Edit) */}
                <div className="space-y-2">
                    <Label htmlFor="edit_pacientes_search_input" className="text-foreground">Pacientes</Label>
                    <div id="edit-paciente-popover-wrapper" className="relative">
                        <div className={cn("min-h-10 p-2 rounded-md border bg-background text-foreground w-full", editFormErrors.pacientesIds && "border-red-500", !editFormErrors.pacientesIds && "border-borde-fuerte")}>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {editSelectedPacientes.map((paciente) => (
                                    <Badge key={paciente.id} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                        {paciente.persona.nombreCompleto}
                                        <button type="button" className="ml-1 rounded-full outline-none focus:outline-none" onClick={() => handleRemoveEditPaciente(paciente.id)}><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                            <Input
                                id="edit_pacientes_search_input"
                                type="text" placeholder="Buscar pacientes..."
                                value={editPacienteSearch}
                                onChange={(e) => setEditPacienteSearch(e.target.value)}
                                onFocus={() => setIsEditPacientePopoverOpen(true)}
                                className="bg-transparent border-0 text-foreground placeholder:text-tenue focus:ring-0 focus:outline-none p-0 w-full"
                            />
                            {isEditPacientePopoverOpen && (
                                <div className="absolute z-[60] w-full mt-1 bg-card border border-borde-fuerte rounded-md shadow-lg max-h-60 overflow-auto">
                                    {editPacienteSearchResults.length > 0 && editPacienteSearch.trim().length < 2 && (
                                        <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-tenue">
                                            Pacientes de este psicólogo
                                        </div>
                                    )}
                                    {editPacienteSearchResults.length > 0 ? (
                                        editPacienteSearchResults.map((paciente) => (
                                            <div key={paciente.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-background text-foreground border-b border-borde last:border-b-0" onClick={() => handleSelectEditPaciente(paciente)}>
                                                <Check className={cn("h-4 w-4", editSelectedPacientes.some(p => p.id === paciente.id) ? "opacity-100" : "opacity-0")} />
                                                <span>{paciente.persona.nombreCompleto}</span>
                                                {paciente.esDelPsicologo && editPacienteSearch.trim().length > 1 && (
                                                    <span className="ml-auto text-sm text-info">Su paciente</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-6 text-center text-sm text-tenue">
                                            {editPacienteSearch.trim().length > 1
                                                ? "No se encontraron pacientes."
                                                : editFormData.psicologoId
                                                    ? "Este psicólogo todavía no tiene pacientes. Escribe para buscar."
                                                    : "Elige un psicólogo para ver sus pacientes, o escribe para buscar"}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {editFormErrors.pacientesIds && <p className="text-sm text-peligro">{editFormErrors.pacientesIds}</p>}
                </div>
                {editFormErrors.general && <p className="text-sm text-peligro py-2 text-center">{editFormErrors.general}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 pt-4 mt-auto border-t border-borde sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full border-borde-fuerte text-suave hover:bg-superficie sm:w-auto" disabled={isEditSubmitting}>Cancelar</Button>
                <Button
                    onClick={handleUpdateSesion}
                    className="w-full sm:w-auto" 
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }} 
                    disabled={isEditSubmitting || editingSesion?.estado?.nombre === "Finalizada" || editingSesion?.estado?.nombre === "Cancelada"}
                    title={editingSesion?.estado?.nombre === "Finalizada" || editingSesion?.estado?.nombre === "Cancelada" ? "No se puede guardar una sesión finalizada o cancelada" : ""}
                >
                    {isEditSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>
        </DialogContent>
    </Dialog>

    {/* RF 3.5 - Pago de la sesión */}
    <DialogoPago
      sesion={sesionPago}
      mediosDePago={mediosDePago}
      onClose={() => setSesionPago(null)}
      onGuardado={(sesionId, pago) =>
        setSesiones((prev) => prev.map((s) => (s.id === sesionId ? { ...s, pago } : s)))
      }
    />

    {/* RF 4.3 - Reprogramación por el paciente dentro de los horarios del psicólogo */}
    <DialogoHorarios abierto={horariosAbierto} onClose={() => setHorariosAbierto(false)} />
    <DialogoReprogramar
      sesion={sesionReprogramar}
      onClose={() => setSesionReprogramar(null)}
      onReprogramada={recargarSesiones}
    />

    </div>
  )
}