//src/app/(main)/informes/editar/[id]/page.tsx
//src/app/(main)/informes/editar/[id]/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import DictadoVoz from "@/components/sistema/DictadoVoz";
import PropuestaIA from "@/components/sistema/PropuestaIA";
import { useRouter, useParams } from 'next/navigation';
import MemopsyLogo from '@/app/components/MemopsyLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TypographyH1, TypographyP, TypographySmall } from '@/components/ui/typography';
import { FileEdit as PageIcon, Search, X, Loader2, AlertTriangle, Save, ArrowLeft, Lock } from "lucide-react"
import { cn } from "@/lib/utils";

// Interfaces
interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  nombreCompleto?: string; 
}

interface InformeData {
  id: string;
  titulo: string;
  contenido: string;
  etiquetas?: string | null;
  esPrivado: boolean;
  psicologo?: { id: string; nombre?: string };
  pacientes: Paciente[];
}

interface FormErrors {
  titulo?: string;
  contenido?: string;
  pacientesIds?: string;
  general?: string;
}



export default function EditarInformePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const informeId = params?.id as string | undefined;

  // Navbar states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [nombreCompletoNav, setNombreCompletoNav] = useState('');
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    etiquetas: '',
    esPrivado: true,
    pacientesIds: [] as string[],
  });
  const [initialInformeTitle, setInitialInformeTitle] = useState('');
  const [selectedPacientes, setSelectedPacientes] = useState<Paciente[]>([]);
  const [pacienteSearchQuery, setPacienteSearchQuery] = useState('');
  const [pacienteSearchResults, setPacienteSearchResults] = useState<Paciente[]>([]);
  const [isPacienteSearchLoading, setIsPacienteSearchLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [isPacientePopoverOpen, setIsPacientePopoverOpen] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  const fetchPacienteSuggestions = async (query: string) => {
    if (query.length === 1) { setPacienteSearchResults([]); return; }
    const psicologoId = session?.user?.psicologoId;
    setIsPacienteSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (psicologoId) params.set('psicologoId', String(psicologoId));
      const response = await fetch(`/api/pacientes/buscar?${params.toString()}`);
      if (!response.ok) throw new Error('Error buscando pacientes');
      const data = await response.json();
      const results = (data.data || data).map((p: any) => ({ // Use 'any' if structure is not strictly Paciente yet
          id: p.id,
          nombre: p.persona.nombre,
          apellido: p.persona.apellido,
          dni: p.persona.dni,
          nombreCompleto: `${p.persona.nombre} ${p.persona.apellido}` 
      }));
      setPacienteSearchResults(results);
    } catch (error) { console.error("Error fetching patients:", error); setPacienteSearchResults([]); } 
    finally { setIsPacienteSearchLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchPacientes = useCallback(debounce(fetchPacienteSuggestions, 300), [session?.user?.psicologoId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
        const userPermissions = session.user.permisos.map((p: any) => p.nombre);
        // Navbar permissions
        const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
            module.permisosRequeridos.some(pr => userPermissions.includes(pr))
        );
        setModulosPermitidos(filteredMainModules);
        setNombreCompletoNav(session.user.persona?.nombreCompleto || session.user.email || 'Usuario');
        setLoadingPermissions(false);

        // Page content and specific permissions
        if (informeId) {
            setIsLoadingData(true);
            fetch(`/api/informes/${informeId}`)
            .then(async (res) => {
                if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `Error ${res.status}` }));
                throw new Error(errorData.message || `Error ${res.status}`);
                }
                return res.json();
            })
            .then((data: InformeData) => {
                if (session?.user?.psicologoId !== data.psicologo?.id || !userPermissions.includes('Editar Informe')) {
                    setPageError("No tiene permisos para editar este informe o no es el propietario.");
                    setIsLoadingData(false);
                    return;
                }
                setFormData({
                    titulo: data.titulo,
                    contenido: data.contenido,
                    etiquetas: data.etiquetas ?? '',
                    esPrivado: data.esPrivado,
                    //pacientesIds: data.pacientes.map(p => p.id),
                    pacientesIds: data.pacientes.map(p => String(p.id)) // Ensure p.id is a string
                });
                setInitialInformeTitle(data.titulo);
                setSelectedPacientes(data.pacientes.map(p => ({...p, nombreCompleto: `${p.nombre} ${p.apellido}`})));
                setPageError(null);
                setIsLoadingData(false);
            })
            .catch(err => {
                console.error("Error fetching informe data:", err);
                setPageError(err.message);
                setIsLoadingData(false);
            });
        } else {
            setPageError("ID del informe no encontrado.");
            setIsLoadingData(false);
            setLoadingPermissions(false); // Also set this if ID is missing
        }
    } else if (status === 'loading') {
        setLoadingPermissions(true);
        setIsLoadingData(true);
    }
  }, [informeId, status, session, router]);

  useEffect(() => {
    if (pacienteSearchQuery.length > 1 || pacienteSearchQuery.length === 0) debouncedFetchPacientes(pacienteSearchQuery);
    else setPacienteSearchResults([]);
  }, [pacienteSearchQuery, debouncedFetchPacientes]);

  useEffect(() => { 
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setIsPacientePopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverRef]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => { router.push(ruta); setIsMenuOpen(false); };
  const handleLogout = async () => { await cerrarSesion(); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };


  // Lo dictado se suma al final de lo que ya está escrito, nunca lo reemplaza.
  const agregarDictado = (texto: string) => {
    setFormData(prev => ({
      ...prev,
      contenido: prev.contenido.trim() ? `${prev.contenido.trimEnd()} ${texto}` : texto,
    }));
    if (formErrors.contenido) setFormErrors(prev => ({ ...prev, contenido: undefined }));
  };

  const usarPropuestaIA = (texto: string) => {
    setFormData(prev => ({ ...prev, contenido: texto }));
  };

  const handleSelectPaciente = (paciente: Paciente) => {
    if (!selectedPacientes.find(p => p.id === paciente.id)) {
      const newSelected = [...selectedPacientes, paciente];
      setSelectedPacientes(newSelected);
      setFormData(prev => ({ ...prev, pacientesIds: newSelected.map(p => p.id) }));
      if (formErrors.pacientesIds) setFormErrors(prev => ({...prev, pacientesIds: undefined}));
    }
    setPacienteSearchQuery(''); setPacienteSearchResults([]); setIsPacientePopoverOpen(false);
  };

  const handleRemovePaciente = (pacienteId: string) => {
    const newSelected = selectedPacientes.filter(p => p.id !== pacienteId);
    setSelectedPacientes(newSelected);
    setFormData(prev => ({ ...prev, pacientesIds: newSelected.map(p => p.id) }));
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
    if (!validateForm() || !informeId) return;
    setIsSubmitting(true); setFormErrors({});
    try {
      const response = await fetch(`/api/informes/${informeId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (response.ok) router.push(`/informes/detalle/${informeId}`);
      else {
        const errorData = await response.json();
        setFormErrors({ general: errorData.message || 'Error al actualizar el informe.' });
        if (errorData.errors) setFormErrors(prev => ({ ...prev, ...errorData.errors }));
      }
    } catch (error) { console.error("Submit error:", error); setFormErrors({ general: 'Error de conexión o del servidor.' }); } 
    finally { setIsSubmitting(false); }
  };

  if (loadingPermissions || isLoadingData) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{backgroundColor: "var(--background)"}}><Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" /><TypographyP className="text-foreground">Cargando datos...</TypographyP></div>;
  }

  return (
    <div className="min-h-screen">
   

      
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {pageError ? (
            <div className="text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
                <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-peligro" />
                <TypographyH1 className="mb-4 text-foreground">Error</TypographyH1>
                <TypographyP className="text-suave">{pageError}</TypographyP>
                <Button onClick={() => router.push('/informes/lista')} className="mt-6 bg-primary text-primary-foreground hover:bg-opacity-80">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Lista
                </Button>
            </div>
        ) : (
        <>
            <EncabezadoPagina titulo="Editar nota clínica" descripcion={<>Modificando: <span className="font-semibold">&ldquo;{initialInformeTitle}&rdquo;</span></>} volverA="/informes" textoVolver="Volver a Informes" />
            
            <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
            <CardHeader>
                <CardTitle className="text-2xl text-dorado flex items-center"><PageIcon className="mr-3 h-7 w-7"/>Actualizar Datos</CardTitle>
                <CardDescription className="text-tenue">Modifique los campos necesarios y guarde los cambios.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                {formErrors.general && (
                    <div className="p-3 bg-red-500/10 text-peligro border border-red-400/40 rounded-md flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-peligro" /> <p>{formErrors.general}</p>
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="titulo" className="text-texto-2">Título</Label>
                    <Input id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange} className={cn("bg-background text-foreground border-borde-fuerte focus:border-dorado", formErrors.titulo && "border-red-500")} />
                    {formErrors.titulo && <TypographySmall className="text-peligro">{formErrors.titulo}</TypographySmall>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contenido" className="text-texto-2">Contenido</Label>
                    <Textarea id="contenido" name="contenido" value={formData.contenido} onChange={handleInputChange} rows={8} className={cn("bg-background text-foreground border-borde-fuerte focus:border-dorado", formErrors.contenido && "border-red-500")} />
                    {formErrors.contenido && <TypographySmall className="text-peligro">{formErrors.contenido}</TypographySmall>}
                    <DictadoVoz onTexto={agregarDictado} disabled={isSubmitting} />
                    <PropuestaIA texto={formData.contenido} onAceptar={usarPropuestaIA} disabled={isSubmitting} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="etiquetas" className="text-texto-2">Etiquetas</Label>
                    <Input id="etiquetas" name="etiquetas" value={formData.etiquetas} onChange={handleInputChange} placeholder="Ej: ansiedad, seguimiento, primera consulta" className="bg-background text-foreground border-borde-fuerte focus:border-dorado" />
                    <TypographySmall className="text-tenue">Separá las etiquetas con comas.</TypographySmall>
                </div>

                <p className="flex items-start gap-2 rounded-md border border-borde bg-background p-3 text-sm text-suave">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
                      La nota clínica es privada: solo la ves vos. Lo que quieras compartir con el paciente lo cargás después en su informe de seguimiento.
                    </p>

                <div className="space-y-2">
                    <Label htmlFor="pacienteSearch" className="text-texto-2">Pacientes asociados</Label>
                    <div ref={popoverRef}>
                    <Popover open={isPacientePopoverOpen} onOpenChange={setIsPacientePopoverOpen}>
                        <PopoverTrigger asChild>
                        <div className="relative">
                            <Input id="pacienteSearch" type="text" placeholder="Buscar paciente..." value={pacienteSearchQuery}
                                onChange={(e) => {setPacienteSearchQuery(e.target.value); setIsPacientePopoverOpen(true);}}
                                onFocus={() => {setIsPacientePopoverOpen(true); debouncedFetchPacientes(pacienteSearchQuery);}}
                                className={cn("bg-background text-foreground border-borde-fuerte focus:border-dorado pr-10", formErrors.pacientesIds && "border-red-500")}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-tenue" />
                        </div>
                        </PopoverTrigger>
                        {isPacientePopoverOpen && (pacienteSearchResults.length > 0 || isPacienteSearchLoading) && (
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-borde-fuerte text-foreground">
                            {isPacienteSearchLoading && <div className="p-4 text-center text-sm text-tenue">Buscando...</div>}
                            {!isPacienteSearchLoading && pacienteSearchResults.length === 0 && pacienteSearchQuery.length > 1 && <div className="p-4 text-center text-sm text-tenue">No se encontraron pacientes.</div>}
                            {!isPacienteSearchLoading && pacienteSearchResults.length > 0 && (
                            <ul className="max-h-60 overflow-y-auto">
                                {pacienteSearchResults.map(paciente => (
                                <li key={paciente.id} onMouseDown={(e) => { e.preventDefault(); handleSelectPaciente(paciente); }} className="p-3 hover:bg-background cursor-pointer text-sm border-b border-borde last:border-b-0">
                                    {paciente.nombreCompleto} (DNI: {paciente.dni || 'N/A'})
                                </li>))}
                            </ul>)}
                        </PopoverContent>)}
                    </Popover>
                    </div>
                    {formErrors.pacientesIds && <TypographySmall className="text-peligro">{formErrors.pacientesIds}</TypographySmall>}
                    <div className="mt-3 space-x-2 space-y-2">
                    {selectedPacientes.map(paciente => (
                        <Badge key={paciente.id} className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
                        {paciente.nombreCompleto}
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePaciente(paciente.id)} className="ml-1.5 p-0 h-4 w-4 text-primary-foreground hover:bg-transparent hover:text-peligro"><X className="h-3.5 w-3.5" /></Button>
                        </Badge>
                    ))}
                    </div>
                </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-3 pt-6 border-t border-borde mt-6">
                <Button type="button" variant="outline" onClick={() => router.push(informeId ? `/informes/detalle/${informeId}` : '/informes/lista')}
                    className="border-dorado text-dorado hover:bg-primary hover:text-primary-foreground">
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-80">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
                </CardFooter>
            </form>
            </Card>
        </>
        )}
      </main>
    </div>
  );
}