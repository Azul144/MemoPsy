//src/app/(main)/registrar/page.tsx
//src/app/(main)/registrar/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import DictadoVoz from "@/components/sistema/DictadoVoz";
import PropuestaIA from "@/components/sistema/PropuestaIA";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { TypographyH1, TypographyP, TypographySmall } from '@/components/ui/typography';
import { FilePlus, X, Check, Loader2, AlertCircle, Lock } from "lucide-react"
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

  // Form states
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    etiquetas: '',
    esPrivado: true,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
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
      const newSelectedPacientes = [...selectedPacientes, paciente];
      setSelectedPacientes(newSelectedPacientes);
      setFormData(prev => ({ ...prev, pacientesIds: newSelectedPacientes.map(p => p.id) }));
      if (formErrors.pacientesIds) setFormErrors(prev => ({ ...prev, pacientesIds: undefined }));
    }
    setPacienteSearchQuery(''); // Keep search query
    setPacienteSearchResults([]); // Keep search results visible
    setIsPacientePopoverOpen(false); // Keep popover open for further selections
    
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: "var(--background)" }}>
        <Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" />
        <TypographyP className="text-foreground">Cargando...</TypographyP>
      </div>
    );
  }

  if (hasPagePermission === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 flex-grow flex items-center justify-center">
            <div className="text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
                <AlertCircle className="w-16 h-16 mx-auto mb-6 text-peligro" />
                <TypographyH1 className="mb-4 text-foreground">Acceso Denegado</TypographyH1>
                <TypographyP className="text-suave">No tiene los permisos necesarios para registrar informes.</TypographyP>
                <Button onClick={() => router.push('/informes')} className="mt-6 bg-primary text-primary-foreground hover:bg-opacity-80">
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
        <EncabezadoPagina titulo="Registrar nota clínica" descripcion="Completá los datos de la sesión y asociá la nota a uno o más pacientes." volverA="/informes" textoVolver="Volver a Informes" />

        <Card className="max-w-2xl mx-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--borde)" }}>
          <CardHeader>
            <CardTitle className="text-2xl text-dorado">Datos de la nota</CardTitle>
            <CardDescription className="text-tenue">Completá todos los campos obligatorios.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {formErrors.general && (
                <div className="p-3 bg-red-500/10 text-peligro border border-red-400/40 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-peligro" />
                  <p>{formErrors.general}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-texto-2">Título</Label>
                <Input
                  id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange}
                  placeholder="Ej: Informe de Progreso Trimestral"
                  className={cn("bg-background text-foreground border-borde-fuerte focus:border-dorado", formErrors.titulo && "border-red-500")}
                />
                {formErrors.titulo && <TypographySmall className="text-peligro">{formErrors.titulo}</TypographySmall>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contenido" className="text-texto-2">Contenido</Label>
                <Textarea
                  id="contenido" name="contenido" value={formData.contenido} onChange={handleInputChange}
                  placeholder="Escribí o dictá lo trabajado en la sesión..." rows={8}
                  className={cn("bg-background text-foreground border-borde-fuerte focus:border-dorado", formErrors.contenido && "border-red-500")}
                />
                {formErrors.contenido && <TypographySmall className="text-peligro">{formErrors.contenido}</TypographySmall>}
                <DictadoVoz onTexto={agregarDictado} disabled={isSubmitting} />
                <PropuestaIA texto={formData.contenido} onAceptar={usarPropuestaIA} disabled={isSubmitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="etiquetas" className="text-texto-2">Etiquetas</Label>
                <Input
                  id="etiquetas" name="etiquetas" value={formData.etiquetas} onChange={handleInputChange}
                  placeholder="Ej: ansiedad, seguimiento, primera consulta"
                  className="bg-background text-foreground border-borde-fuerte focus:border-dorado"
                />
                <TypographySmall className="text-tenue">Separá las etiquetas con comas. Sirven para categorizar y buscar la nota.</TypographySmall>
              </div>

              <p className="flex items-start gap-2 rounded-md border border-borde bg-background p-3 text-sm text-suave">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
                  La nota clínica es privada: solo la ves vos. Lo que quieras compartir con el paciente lo cargás después en su informe de seguimiento.
                </p>

              <div className="space-y-2">
                <Label htmlFor="pacienteSearch" className="text-texto-2">Pacientes asociados</Label>

                <div className={cn(
                  "min-h-10 p-2 rounded-md border bg-background text-foreground w-full",
                  formErrors.pacientesIds ? "border-red-500" : "border-borde-fuerte"
                )}>
                  {/* Selected Pacientes */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPacientes.map(paciente => (
                      <Badge key={paciente.id} className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
                        {paciente.persona?.nombreCompleto || paciente.nombreCompleto}
                        <button
                          type="button"
                          className="ml-1 rounded-full outline-none"
                          onClick={() => handleRemovePaciente(paciente.id)}
                        >
                          <X className="h-3 w-3 text-primary-foreground hover:text-peligro" />
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
                      //}}
                      className="bg-transparent border-0 text-foreground placeholder:text-tenue focus:ring-0 focus:outline-none p-0 w-full"
                    />

                    {isPacientePopoverOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-borde-fuerte rounded-md shadow-lg max-h-60 overflow-auto">
                        {isPacienteSearchLoading ? (
                          <div className="p-4 text-center text-sm text-tenue">Buscando...</div>
                        ) : pacienteSearchResults.length > 0 ? (
                          pacienteSearchResults.map((paciente) => (
                            <div
                              key={paciente.id}
                              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-background text-foreground border-b border-borde last:border-b-0"
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
                          <div className="p-4 text-center text-sm text-tenue">
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
                  <TypographySmall className="text-peligro">{formErrors.pacientesIds}</TypographySmall>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-end space-x-3 pt-6 border-t border-borde mt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/informes')}
                className="border-dorado text-dorado hover:bg-primary hover:text-primary-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} 
                className="bg-primary text-primary-foreground hover:bg-opacity-80">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                Guardar nota
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
