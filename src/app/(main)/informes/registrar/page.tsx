//src/app/(main)/registrar/page.tsx
//src/app/(main)/registrar/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter } from 'next/navigation';
import MemopsyLogo from '@/app/components/MemopsyLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TypographyH1, TypographyP, TypographySmall } from '@/components/ui/typography';
import { 
    FilePlus, Users, Search, X, Check, Loader2, AlertCircle, 
    Menu, LogOut, HomeIcon, Shield, CalendarIcon, FileText as MainModuleIcon // Renamed to avoid conflict
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Interfaces
interface Paciente {
  id: string;
  persona: {
    nombre: string;
    apellido: string;
    dni?: string;
    nombreCompleto?: string;
  };
  nombreCompleto?: string;
}

interface FormErrors {
  titulo?: string;
  contenido?: string;
  pacientesIds?: string;
  general?: string;
}


// This would ideally be a shared constant

export default function RegistrarInformePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Navbar states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [nombreCompletoNav, setNombreCompletoNav] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    etiquetas: '',
    esPrivado: false,
    pacientesIds: [] as string[],
  });
  const [selectedPacientes, setSelectedPacientes] = useState<Paciente[]>([]);
  const [pacienteSearchQuery, setPacienteSearchQuery] = useState('');
  const [pacienteSearchResults, setPacienteSearchResults] = useState<Paciente[]>([]);
  const [isPacienteSearchLoading, setIsPacienteSearchLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isPacientePopoverOpen, setIsPacientePopoverOpen] = useState(false);
  
  const [hasPagePermission, setHasPagePermission] = useState<boolean | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);


  const popoverRef = useRef<HTMLDivElement>(null);

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  const fetchPacientes = async (query: string) => {
    const psicologoId = session?.user?.psicologoId;
    // Vacío: todos los pacientes (los del psicólogo primero). 2+ letras: busca entre todos.
    // 1 sola letra: no vale la pena, no buscamos.
    if (query.length === 1) {
      setPacienteSearchResults([]);
      setIsPacienteSearchLoading(false);
      return;
    }
    setIsPacienteSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (psicologoId) params.set('psicologoId', String(psicologoId));
      const response = await fetch(`/api/pacientes/buscar?${params.toString()}`);
      if (!response.ok) throw new Error('Error buscando pacientes');
      const data = await response.json();
      const results = (data.data || data).map((p: any) => ({ // Use 'any' if structure is not strictly Paciente yet
          ...p,
          nombreCompleto: `${p.persona.nombre} ${p.persona.apellido}` 
      }));
      setPacienteSearchResults(results);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPacienteSearchResults([]);
    } finally {
      setIsPacienteSearchLoading(false);
    }
  };
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchPacientes = useCallback(debounce(fetchPacientes, 300), [session?.user?.psicologoId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);
      
      // Page specific permission
      if (userPermissions.includes('Registrar Informe') && session.user.psicologoId) {
        setHasPagePermission(true);
      } else {
        setHasPagePermission(false);
      }

      // Navbar permissions
      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermissions.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);
      setNombreCompletoNav(session.user.persona?.nombreCompleto || session.user.email || 'Usuario');
      setLoadingPermissions(false);
    }
  }, [session, status, router]);

  useEffect(() => {
    // Con 2+ letras busca entre todos; vacío/1 letra muestra los pacientes del psicólogo.
    if (pacienteSearchQuery.length > 1 || pacienteSearchQuery.length === 0) {
      debouncedFetchPacientes(pacienteSearchQuery);
    }
  }, [pacienteSearchQuery, debouncedFetchPacientes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPacientePopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverRef]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      //pacientesIds: selectedPacientes.map(p => p.id)
      pacientesIds: selectedPacientes.map(p => String(p.id)) // Ensure p.id is a string
    }));
  }, [selectedPacientes]);


  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => { router.push(ruta); setIsMenuOpen(false); };
  const handleLogout = async () => { await cerrarSesion(); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, esPrivado: checked }));
  };

  const handleSelectPaciente = (paciente: Paciente) => {
    if (!selectedPacientes.find(p => p.id === paciente.id)) {
      const newSelectedPacientes = [...selectedPacientes, paciente];
      setSelectedPacientes(newSelectedPacientes);
      setFormData(prev => ({ ...prev, pacientesIds: newSelectedPacientes.map(p => p.id) }));
      if (formErrors.pacientesIds) setFormErrors(prev => ({ ...prev, pacientesIds: undefined }));
    }
    setPacienteSearchQuery(''); // Keep search query
    setPacienteSearchResults([]); // Keep search results visible
    setIsPacientePopoverOpen(false); // Keep popover open for further selections
    
    // Optional: You might want to clear the search query if the user should perform a new search for each new patient.
    // If so, just keep setPacienteSearchQuery(''); and setPacienteSearchResults([]);
    // For now, let's keep it open and results visible to allow multiple selections from the same list.
    // The existing useEffect for handleClickOutside should handle closing when clicking away.
  };

  const handleRemovePaciente = (pacienteId: string) => {
    const newSelectedPacientes = selectedPacientes.filter(p => p.id !== pacienteId);
    setSelectedPacientes(newSelectedPacientes);
    setFormData(prev => ({ ...prev, pacientesIds: newSelectedPacientes.map(p => p.id) }));
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.titulo.trim()) errors.titulo = 'El título es requerido.';
    if (!formData.contenido.trim()) errors.contenido = 'El contenido es requerido.';
    if (formData.pacientesIds.length === 0) errors.pacientesIds = 'Debe seleccionar al menos un paciente.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setFormErrors({});
    try {
      const response = await fetch('/api/informes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.status === 201) {
        router.push('/informes/lista');
      } else {
        const errorData = await response.json();
        setFormErrors({ general: errorData.message || 'Error al registrar el informe.' });
        if (errorData.errors) setFormErrors(prev => ({ ...prev, ...errorData.errors }));
      }
    } catch (error) {
      console.error("Submit error:", error);
      setFormErrors({ general: 'Error de conexión o del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || loadingPermissions || hasPagePermission === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
        <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
        <TypographyP className="text-white">Cargando...</TypographyP>
      </div>
    );
  }

  if (hasPagePermission === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 flex-grow flex items-center justify-center">
            <div className="text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#1D3434' }}>
                <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
                <TypographyH1 className="mb-4 text-white">Acceso Denegado</TypographyH1>
                <TypographyP className="text-gray-300">No tiene los permisos necesarios para registrar informes.</TypographyP>
                <Button onClick={() => router.push('/informes')} className="mt-6 bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">
                    Volver a Informes
                </Button>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Registrar Nuevo Informe" descripcion="Complete el formulario para crear un nuevo informe sobre paciente/s." volverA="/informes" textoVolver="Volver a Informes" />

        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
          <CardHeader>
            <CardTitle className="text-2xl text-[#F1C77A]">Datos del Informe</CardTitle>
            <CardDescription className="text-gray-400">Asegúrese de completar todos los campos requeridos.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {formErrors.general && (
                <div className="p-3 bg-red-500/10 text-red-300 border border-red-400/40 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
                  <p>{formErrors.general}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-gray-200">Título del Informe</Label>
                <Input
                  id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange}
                  placeholder="Ej: Informe de Progreso Trimestral"
                  className={cn("bg-[#152A2A] text-white border-gray-600 focus:border-[#F1C77A]", formErrors.titulo && "border-red-500")}
                />
                {formErrors.titulo && <TypographySmall className="text-red-400">{formErrors.titulo}</TypographySmall>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contenido" className="text-gray-200">Contenido</Label>
                <Textarea
                  id="contenido" name="contenido" value={formData.contenido} onChange={handleInputChange}
                  placeholder="Describa aquí los detalles del informe..." rows={8}
                  className={cn("bg-[#152A2A] text-white border-gray-600 focus:border-[#F1C77A]", formErrors.contenido && "border-red-500")}
                />
                {formErrors.contenido && <TypographySmall className="text-red-400">{formErrors.contenido}</TypographySmall>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="etiquetas" className="text-gray-200">Etiquetas</Label>
                <Input
                  id="etiquetas" name="etiquetas" value={formData.etiquetas} onChange={handleInputChange}
                  placeholder="Ej: ansiedad, seguimiento, primera consulta"
                  className="bg-[#152A2A] text-white border-gray-600 focus:border-[#F1C77A]"
                />
                <TypographySmall className="text-gray-400">Separá las etiquetas con comas. Sirven para categorizar y buscar el informe.</TypographySmall>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="esPrivado" checked={formData.esPrivado} onCheckedChange={handleCheckboxChange}
                  className="data-[state=checked]:bg-[#F1C77A] data-[state=checked]:text-[#1D3434] border-gray-600"
                />
                <Label htmlFor="esPrivado" className="font-normal text-gray-300">
                  Marcar como privado (solo visible para el psicólogo)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pacienteSearch" className="text-gray-200">Pacientes Asociados</Label>

                <div className={cn(
                  "min-h-10 p-2 rounded-md border bg-[#152A2A] text-white w-full",
                  formErrors.pacientesIds ? "border-red-500" : "border-gray-600"
                )}>
                  {/* Selected Pacientes */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPacientes.map(paciente => (
                      <Badge key={paciente.id} className="bg-[#F1C77A] text-[#1D3434] hover:bg-[#e0b66e] text-sm font-medium">
                        {paciente.persona?.nombreCompleto || paciente.nombreCompleto}
                        <button
                          type="button"
                          className="ml-1 rounded-full outline-none"
                          onClick={() => handleRemovePaciente(paciente.id)}
                        >
                          <X className="h-3 w-3 text-[#1D3434] hover:text-red-500" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Search input + dropdown */}
                  <div className="relative" ref={popoverRef}>
                    <Input
                      id="pacienteSearch"
                      type="text"
                      placeholder="Buscar paciente por nombre, apellido o DNI..."
                      value={pacienteSearchQuery}
                      //onChange={(e) => {
                      //  setPacienteSearchQuery(e.target.value)
                      //  if (!isPacientePopoverOpen && e.target.value.length > 1) {
                      //    setIsPacientePopoverOpen(true)
                      //  }
                      //}}
                      onChange={(e) => {
                        setPacienteSearchQuery(e.target.value);
                        setIsPacientePopoverOpen(true);
                        }}
                        onFocus={() => {
                          setIsPacientePopoverOpen(true);
                          debouncedFetchPacientes(pacienteSearchQuery);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setIsPacientePopoverOpen(false);
                          }, 150);
                      }}
                      //onFocus={() => {
                      //  if (pacienteSearchQuery.length > 1) setIsPacientePopoverOpen(true)
                      //}}
                      className="bg-transparent border-0 text-white placeholder:text-gray-400 focus:ring-0 focus:outline-none p-0 w-full"
                    />

                    {isPacientePopoverOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-[#1D3434] border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {isPacienteSearchLoading ? (
                          <div className="p-4 text-center text-sm text-gray-400">Buscando...</div>
                        ) : pacienteSearchResults.length > 0 ? (
                          pacienteSearchResults.map((paciente) => (
                            <div
                              key={paciente.id}
                              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#152A2A] text-white border-b border-gray-700 last:border-b-0"
                              onMouseDown={(e) => { e.preventDefault(); handleSelectPaciente(paciente); }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedPacientes.some(p => p.id === paciente.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{paciente.persona?.nombreCompleto || paciente.nombreCompleto} (DNI: {paciente.persona?.dni || 'N/A'})</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-400">
                            {pacienteSearchQuery.length > 1
                              ? "No se encontraron pacientes."
                              : "No tenés pacientes con sesiones aún. Escribí un nombre, apellido o DNI para buscar."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {formErrors.pacientesIds && (
                  <TypographySmall className="text-red-400">{formErrors.pacientesIds}</TypographySmall>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-end space-x-3 pt-6 border-t border-gray-700 mt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/informes')}
                className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A] hover:text-[#1D3434]">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} 
                className="bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                Guardar Informe
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
