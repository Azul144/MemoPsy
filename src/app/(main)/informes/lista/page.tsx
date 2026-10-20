"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter, useSearchParams } from 'next/navigation';
import MemopsyLogo from '@/app/components/MemopsyLogo';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { TypographyH1, TypographyH2, TypographyP, TypographySmall } from '@/components/ui/typography';
import { Brain, Search, Filter, Edit, Eye, FileText as MainModuleIcon, User, Loader2, AlertTriangle, XCircle, Lock, Unlock, PlusCircle, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils";

// Interfaces
interface Informe {
  id: string;
  titulo: string;
  etiquetas?: string | null;
  fechaCreacion: string;
  esPrivado: boolean;
  psicologo?: { id: string; nombre: string; }; 
  pacientes?: Array<{ id: string; nombre: string; dni?: string }>;
}

interface PacienteInfo {
  id: string;
  nombreCompleto: string;
  persona?: {
    dni?: string;
  };
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  limit: number;
  totalItems: number;
}

interface SortingState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}



// Next pide envolver en <Suspense> a los componentes que leen la URL con useSearchParams
export default function ListaInformesPage() {
  return (
    <Suspense>
      <ListaInformes />
    </Suspense>
  );
}

function ListaInformes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navbar states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [nombreCompletoNav, setNombreCompletoNav] = useState('');
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // User role states
  const [userRoles, setUserRoles] = useState<{
    isPsicologo: boolean;
    isPaciente: boolean;
  }>({ isPsicologo: false, isPaciente: false });
  
  // Page specific states for Psychologist view
  const [informesPsicologo, setInformesPsicologo] = useState<Informe[]>([]);
  const [isLoadingPsicologo, setIsLoadingPsicologo] = useState(false);
  const [errorPsicologo, setErrorPsicologo] = useState<string | null>(null);
  
  const [paginationPsicologo, setPaginationPsicologo] = useState<PaginationState>({
    currentPage: parseInt(searchParams.get('psicologoPage') || '1', 10),
    totalPages: 1,
    limit: 10,
    totalItems: 0,
  });
  
  const [filtersPsicologo, setFiltersPsicologo] = useState<{ pacienteQuery: string; etiquetaQuery: string }>({
    pacienteQuery: searchParams.get('psicologoPacienteSearch') || '',
    etiquetaQuery: searchParams.get('psicologoEtiqueta') || '',
  });
  const [etiquetaInput, setEtiquetaInput] = useState(searchParams.get('psicologoEtiqueta') || '');
  
  const [selectedPacienteFilterPsicologo, setSelectedPacienteFilterPsicologo] = useState<PacienteInfo | null>(null);
  
  const [sortingPsicologo, setSortingPsicologo] = useState<SortingState>({
    sortBy: searchParams.get('psicologoSortBy') || 'fechaCreacion',
    sortOrder: (searchParams.get('psicologoSortOrder') || 'desc') as 'asc' | 'desc',
  });

  // Page specific states for Patient view
  const [informesPaciente, setInformesPaciente] = useState<Informe[]>([]);
  const [isLoadingPaciente, setIsLoadingPaciente] = useState(false);
  const [errorPaciente, setErrorPaciente] = useState<string | null>(null);
  
  const [paginationPaciente, setPaginationPaciente] = useState<PaginationState>({
    currentPage: parseInt(searchParams.get('pacientePage') || '1', 10),
    totalPages: 1,
    limit: 5, // Smaller limit for patient view since it's secondary
    totalItems: 0,
  });
  
  const [sortingPaciente, setSortingPaciente] = useState<SortingState>({
    sortBy: searchParams.get('pacienteSortBy') || 'fechaCreacion',
    sortOrder: (searchParams.get('pacienteSortOrder') || 'desc') as 'asc' | 'desc',
  });

  // General states
  const [canEditInforme, setCanEditInforme] = useState(false);
  const [hasPermissionToViewPage, setHasPermissionToViewPage] = useState<boolean|null>(null);

  // Patient search states (only for psychologist view)
  const [pacienteSearchInput, setPacienteSearchInput] = useState('');
  const [pacienteSearchResults, setPacienteSearchResults] = useState<PacienteInfo[]>([]);
  const [isPacienteSearchLoading, setIsPacienteSearchLoading] = useState(false);
  const [isPacienteSearchPopoverOpen, setIsPacienteSearchPopoverOpen] = useState(false);
  const pacienteSearchPopoverRef = useRef<HTMLDivElement>(null);

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  const fetchPacienteSuggestions = async (query: string) => {
    if (query.length < 2) {
      setPacienteSearchResults([]); return;
    }
    setIsPacienteSearchLoading(true);
    try {
      const response = await fetch(`/api/pacientes/buscar?q=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) throw new Error('Error buscando pacientes');
      const data = await response.json();
      setPacienteSearchResults((data.data || data).map((p: any) => ({
        id: p.id,
        nombreCompleto: p.persona?.nombreCompleto || `${p.persona?.nombre || ''} ${p.persona?.apellido || ''}`,
        persona: p.persona ? { dni: p.persona.dni } : undefined
      })));
    } catch (e) { console.error(e); setPacienteSearchResults([]); }
    finally { setIsPacienteSearchLoading(false); }
  };

  const debouncedFetchPacientes = useCallback(debounce(fetchPacienteSuggestions, 300), []);

  useEffect(() => {
    if(pacienteSearchInput.length > 1) {
        debouncedFetchPacientes(pacienteSearchInput);
    } else {
        setPacienteSearchResults([]);
    }
  }, [pacienteSearchInput, debouncedFetchPacientes]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pacienteSearchPopoverRef.current && !pacienteSearchPopoverRef.current.contains(event.target as Node)) {
        setIsPacienteSearchPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pacienteSearchPopoverRef]);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update psychologist pagination and filters
    if (userRoles.isPsicologo) {
      params.set('psicologoPage', paginationPsicologo.currentPage.toString());
      params.set('psicologoSortBy', sortingPsicologo.sortBy);
      params.set('psicologoSortOrder', sortingPsicologo.sortOrder);

      params.delete('psicologoPaciente'); 
      params.delete('psicologoPacienteId');
      params.delete('psicologoPacienteSearch');

      if (selectedPacienteFilterPsicologo) {
          params.set('psicologoPacienteId', selectedPacienteFilterPsicologo.id);
          params.set('psicologoPacienteSearch', selectedPacienteFilterPsicologo.nombreCompleto);
      } else if (filtersPsicologo.pacienteQuery) {
          params.set('psicologoPacienteSearch', filtersPsicologo.pacienteQuery);
      }

      params.delete('psicologoEtiqueta');
      if (filtersPsicologo.etiquetaQuery) {
          params.set('psicologoEtiqueta', filtersPsicologo.etiquetaQuery);
      }
    }

    // Update patient pagination
    if (userRoles.isPaciente) {
      params.set('pacientePage', paginationPaciente.currentPage.toString());
      params.set('pacienteSortBy', sortingPaciente.sortBy);
      params.set('pacienteSortOrder', sortingPaciente.sortOrder);
    }

    router.replace(`/informes/lista?${params.toString()}`, { scroll: false });
  }, [paginationPsicologo, sortingPsicologo, filtersPsicologo, selectedPacienteFilterPsicologo, 
      paginationPaciente, sortingPaciente, userRoles, router, searchParams]);

  const fetchInformesPsicologo = useCallback(async () => {
    if (status !== 'authenticated' || !hasPermissionToViewPage || !userRoles.isPsicologo) return;
    setIsLoadingPsicologo(true);
    setErrorPsicologo(null);

    const params = new URLSearchParams();
    params.append('page', paginationPsicologo.currentPage.toString());
    params.append('limit', paginationPsicologo.limit.toString());
    params.append('sortBy', sortingPsicologo.sortBy);
    params.append('sortOrder', sortingPsicologo.sortOrder);
    params.append('role', 'psicologo'); // Specify role

    if (selectedPacienteFilterPsicologo) {
        params.append('pacienteId', selectedPacienteFilterPsicologo.id);
    } else if (filtersPsicologo.pacienteQuery) {
        params.append('pacienteSearch', filtersPsicologo.pacienteQuery);
    }

    if (filtersPsicologo.etiquetaQuery) {
        params.append('etiqueta', filtersPsicologo.etiquetaQuery);
    }

    try {
      const response = await fetch(`/api/informes?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar los informes');
      }
      const data = await response.json();
      setInformesPsicologo(data.data || []);
      setPaginationPsicologo(prev => ({
        ...prev,
        totalPages: data.totalPages || 1,
        totalItems: data.total || 0,
        currentPage: data.page || 1
      }));
    } catch (e: any) { 
      setErrorPsicologo(e.message); 
      setInformesPsicologo([]); 
    } 
    finally { setIsLoadingPsicologo(false); }
  }, [status, hasPermissionToViewPage, paginationPsicologo.currentPage, paginationPsicologo.limit, 
      sortingPsicologo, filtersPsicologo.pacienteQuery, filtersPsicologo.etiquetaQuery, userRoles.isPsicologo, selectedPacienteFilterPsicologo]);

  const fetchInformesPaciente = useCallback(async () => {
    if (status !== 'authenticated' || !hasPermissionToViewPage || !userRoles.isPaciente) return;
    setIsLoadingPaciente(true);
    setErrorPaciente(null);

    const params = new URLSearchParams();
    params.append('page', paginationPaciente.currentPage.toString());
    params.append('limit', paginationPaciente.limit.toString());
    params.append('sortBy', sortingPaciente.sortBy);
    params.append('sortOrder', sortingPaciente.sortOrder);
    params.append('role', 'paciente'); // Specify role

    try {
      const response = await fetch(`/api/informes?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar los informes');
      }
      const data = await response.json();
      setInformesPaciente(data.data || []);
      setPaginationPaciente(prev => ({
        ...prev,
        totalPages: data.totalPages || 1,
        totalItems: data.total || 0,
        currentPage: data.page || 1
      }));
    } catch (e: any) { 
      setErrorPaciente(e.message); 
      setInformesPaciente([]); 
    } 
    finally { setIsLoadingPaciente(false); }
  }, [status, hasPermissionToViewPage, paginationPaciente.currentPage, paginationPaciente.limit, 
      sortingPaciente, userRoles.isPaciente]);

  // Initial Load: Session and Permissions
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const userPermisos = session.user.permisos.map((p: any) => p.nombre);
      
      const canViewPage = userPermisos.includes('Ver Informes');
      setHasPermissionToViewPage(canViewPage);
      
      if(canViewPage){
        setCanEditInforme(userPermisos.includes('Editar Informe') && !!session.user.psicologoId);
        
        // Determine user roles
        const isPsicologo = !!session.user.psicologoId;
        const isPaciente = !!session.user.pacienteId;
        
        setUserRoles({ isPsicologo, isPaciente });

        // Initialize filters from URL params for psychologist view
        if (isPsicologo) {
          const initialPacienteId = searchParams.get('psicologoPacienteId');
          const initialPacienteSearch = searchParams.get('psicologoPacienteSearch');

          if (initialPacienteId && initialPacienteSearch) {
            setSelectedPacienteFilterPsicologo({ id: initialPacienteId, nombreCompleto: initialPacienteSearch });
            setPacienteSearchInput(initialPacienteSearch);
            setFiltersPsicologo(prev => ({ ...prev, pacienteQuery: initialPacienteSearch }));
          } else if (initialPacienteSearch) {
            setPacienteSearchInput(initialPacienteSearch);
            setFiltersPsicologo(prev => ({ ...prev, pacienteQuery: initialPacienteSearch }));
            setSelectedPacienteFilterPsicologo(null);
          } else {
            setPacienteSearchInput('');
            setFiltersPsicologo(prev => ({ ...prev, pacienteQuery: '' }));
            setSelectedPacienteFilterPsicologo(null);
          }
        }
      }

      // Navbar permissions
      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermisos.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);
      setNombreCompletoNav(session.user.persona?.nombreCompleto || session.user.email || 'Usuario');
      setLoadingPermissions(false);
    }
  }, [session, status, router, searchParams]);

  // Data fetching when dependencies change
  useEffect(() => {
    if(hasPermissionToViewPage && !loadingPermissions && userRoles.isPsicologo){ 
        fetchInformesPsicologo();
    }
  }, [fetchInformesPsicologo, hasPermissionToViewPage, loadingPermissions]);

  useEffect(() => {
    if(hasPermissionToViewPage && !loadingPermissions && userRoles.isPaciente){ 
        fetchInformesPaciente();
    }
  }, [fetchInformesPaciente, hasPermissionToViewPage, loadingPermissions]);

  // URL Sync when relevant states change
  useEffect(() => {
    if(!loadingPermissions && hasPermissionToViewPage) {
        updateUrlParams();
    }
  }, [paginationPsicologo.currentPage, sortingPsicologo.sortBy, sortingPsicologo.sortOrder, 
      filtersPsicologo.pacienteQuery, selectedPacienteFilterPsicologo,
      paginationPaciente.currentPage, sortingPaciente.sortBy, sortingPaciente.sortOrder,
      updateUrlParams, loadingPermissions, hasPermissionToViewPage]);

  // Event handlers for Psychologist view
  const handlePageChangePsicologo = (newPage: number) => {
    if (newPage >= 1 && newPage <= paginationPsicologo.totalPages && newPage !== paginationPsicologo.currentPage) {
      setPaginationPsicologo(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleSortChangePsicologo = (columnId: string) => {
    const isAsc = sortingPsicologo.sortBy === columnId && sortingPsicologo.sortOrder === 'asc';
    setSortingPsicologo({ sortBy: columnId, sortOrder: isAsc ? 'desc' : 'asc' });
    setPaginationPsicologo(prev => ({ ...prev, currentPage: 1 }));
  };

  // Event handlers for Patient view
  const handlePageChangePaciente = (newPage: number) => {
    if (newPage >= 1 && newPage <= paginationPaciente.totalPages && newPage !== paginationPaciente.currentPage) {
      setPaginationPaciente(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleSortChangePaciente = (columnId: string) => {
    const isAsc = sortingPaciente.sortBy === columnId && sortingPaciente.sortOrder === 'asc';
    setSortingPaciente({ sortBy: columnId, sortOrder: isAsc ? 'desc' : 'asc' });
    setPaginationPaciente(prev => ({ ...prev, currentPage: 1 }));
  };
  
  const handlePacienteFilterSelect = (paciente: PacienteInfo) => {
    setSelectedPacienteFilterPsicologo(paciente);
    setPacienteSearchInput(paciente.nombreCompleto); 
    setFiltersPsicologo(prev => ({ ...prev, pacienteQuery: paciente.nombreCompleto }));
    setIsPacienteSearchPopoverOpen(false);
    setPacienteSearchResults([]);
    setPaginationPsicologo(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearPacienteFilter = () => {
    setSelectedPacienteFilterPsicologo(null);
    setPacienteSearchInput('');
    setFiltersPsicologo({ pacienteQuery: '', etiquetaQuery: '' });
    setEtiquetaInput('');
    setPaginationPsicologo(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleApplyGeneralSearch = () => {
    setSelectedPacienteFilterPsicologo(null);
    setFiltersPsicologo({ pacienteQuery: pacienteSearchInput, etiquetaQuery: etiquetaInput.trim() });
    setPaginationPsicologo(prev => ({ ...prev, currentPage: 1 }));
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => { router.push(ruta); setIsMenuOpen(false); };
  const handleLogout = async () => { await cerrarSesion(); };

  // Render Logic
  if (status === 'loading' || loadingPermissions || hasPermissionToViewPage === null) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
            <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
            <TypographyP className="text-white">Cargando...</TypographyP>
        </div>
    );
  }

  if (hasPermissionToViewPage === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 flex-grow flex items-center justify-center">
            <div className="text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#1D3434' }}>
                <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500" />
                <TypographyH1 className="mb-4 text-white">Acceso Denegado</TypographyH1>
                <TypographyP className="text-gray-300">No tiene permisos para ver esta lista de informes.</TypographyP>
                <Button onClick={() => router.push('/')} className="mt-6 bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">Volver al Inicio</Button>
            </div>
        </main>
      </div>
    );
  }

  const renderPaginationControls = (pagination: PaginationState, onPageChange: (page: number) => void) => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); onPageChange(pagination.currentPage - 1); }} className={cn("hover:bg-[#2A4A4A] hover:text-white", pagination.currentPage === 1 && "pointer-events-none opacity-50 text-gray-500")} />
        </PaginationItem>
        {[...Array(pagination.totalPages)].map((_, i) => (
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(i + 1);}} isActive={pagination.currentPage === i + 1}
              className={cn("hover:text-[#F1C77A] hover:bg-[#2A4A4A]", pagination.currentPage === i+1 && "bg-[#F1C77A] text-[#1D3434] border-[#F1C77A] hover:bg-opacity-80 hover:text-[#1D3434]")}
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); onPageChange(pagination.currentPage + 1); }} className={cn("hover:bg-[#2A4A4A] hover:text-white", pagination.currentPage === pagination.totalPages && "pointer-events-none opacity-50 text-gray-500")} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
  
  const SortableHeader = ({ columnId, label, sorting, onSortChange }: { columnId: string, label: string, sorting: SortingState, onSortChange: (columnId: string) => void }) => (
    <TableHead onClick={() => onSortChange(columnId)} className="cursor-pointer hover:bg-[#2A4A4A] text-gray-200">
      {label} {sorting.sortBy === columnId && (sorting.sortOrder === 'asc' ? '▲' : '▼')}
    </TableHead>
  );

  const renderInformesTable = (informes: Informe[], isLoading: boolean, error: string | null, userRole: 'psicologo' | 'paciente') => (
    <>
      {isLoading && <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-[#F1C77A]" /> <TypographyP className="ml-3 text-gray-300">Cargando informes...</TypographyP></div>}
      {error && <div className="p-4 bg-red-500/10 text-red-300 border border-red-400/40 rounded-md flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-red-400" /> <TypographyP>{error}</TypographyP></div>}
      
      {!isLoading && !error && informes.length === 0 && (
        <Card className="mt-6" style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
          <CardContent className="pt-10 pb-10 text-center">
            <MainModuleIcon className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <TypographyP className="text-gray-400">No se encontraron informes que coincidan con los criterios actuales.</TypographyP>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && informes.length > 0 && (
        <Card style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#2A4A4A]">
                <TableRow>
                  <SortableHeader 
                    columnId="titulo" 
                    label="Título" 
                    sorting={userRole === 'psicologo' ? sortingPsicologo : sortingPaciente}
                    onSortChange=
                    {userRole === 'psicologo' ? handleSortChangePsicologo : handleSortChangePaciente}
                  />
                  <SortableHeader 
                    columnId="fechaCreacion" 
                    label="Fecha de Creación" 
                    sorting={userRole === 'psicologo' ? sortingPsicologo : sortingPaciente}
                    onSortChange={userRole === 'psicologo' ? handleSortChangePsicologo : handleSortChangePaciente}
                  />
                  {userRole === 'psicologo' && (
                    <TableHead className="text-gray-200">Pacientes</TableHead>
                  )}
                  {userRole === 'paciente' && (
                    <TableHead className="text-gray-200">Psicólogo</TableHead>
                  )}
                  <TableHead className="text-gray-200">Privacidad</TableHead>
                  <TableHead className="text-gray-200 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {informes.map((informe) => (
                  <TableRow key={informe.id} className="hover:bg-[#2A4A4A] border-gray-600">
                    <TableCell className="text-white font-medium">
                      {informe.titulo}
                      {informe.etiquetas && informe.etiquetas.trim() && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {informe.etiquetas.split(',').map((e) => e.trim()).filter(Boolean).map((etq, i) => (
                            <Badge key={i} className="bg-[#F1C77A]/20 text-[#F1C77A] text-xs font-normal">{etq}</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(informe.fechaCreacion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </TableCell>
                    
                    {userRole === 'psicologo' && (
                      <TableCell className="text-gray-300">
                        {informe.pacientes && informe.pacientes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {informe.pacientes.map((paciente, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-[#F1C77A] text-[#1D3434]">
                                {paciente.nombre}
                                {paciente.dni && ` (${paciente.dni})`}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <TypographySmall className="text-gray-500">Sin pacientes</TypographySmall>
                        )}
                      </TableCell>
                    )}
                    
                    {userRole === 'paciente' && (
                      <TableCell className="text-gray-300">
                        {informe.psicologo ? (
                          <Badge variant="outline" className="text-xs border-[#F1C77A] text-[#F1C77A]">
                            <Brain className="w-3 h-3 mr-1" />
                            {informe.psicologo.nombre}
                          </Badge>
                        ) : (
                          <TypographySmall className="text-gray-500">Sin asignar</TypographySmall>
                        )}
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Badge variant={informe.esPrivado ? "destructive" : "default"} className="text-xs">
                        {informe.esPrivado ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            Privado
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 mr-1" />
                            Público
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/informes/detalle/${informe.id}`)}
                          className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A] hover:text-[#1D3434]"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEditInforme && userRole === 'psicologo' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/informes/editar/${informe.id}`)}
                            className="border-green-500 text-green-400 hover:bg-primary/90 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10 flex-grow">
        <EncabezadoPagina titulo="Lista de Informes" descripcion="Gestiona y visualiza los informes psicológicos" volverA="/informes" textoVolver="Volver a Informes" />

        {/* Psychologist View */}
        {userRoles.isPsicologo && (
          <div className="mb-8">
            <Card className="mb-6" style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-[#F1C77A]" />
                  Vista del Psicólogo
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Informes creados por usted para sus pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Patient Filter */}
                <div className="mb-6">
                  <Label htmlFor="paciente-filter" className="text-gray-300 mb-2 block">
                    Filtrar por Paciente
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1" ref={pacienteSearchPopoverRef}>
                      <Input
                        id="paciente-filter"
                        value={pacienteSearchInput}
                        onChange={(e) => {
                          setPacienteSearchInput(e.target.value);
                          setIsPacienteSearchPopoverOpen(true);
                        }}
                        placeholder="Buscar paciente por nombre..."
                        className="bg-[#152A2A] border-gray-600 text-white placeholder-gray-400"
                        onFocus={() => setIsPacienteSearchPopoverOpen(true)}
                      />
                      
                      {isPacienteSearchPopoverOpen && (pacienteSearchResults.length > 0 || isPacienteSearchLoading) && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1D3434] border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {isPacienteSearchLoading ? (
                            <div className="p-3 text-center">
                              <Loader2 className="h-4 w-4 animate-spin text-[#F1C77A] mx-auto" />
                            </div>
                          ) : (
                            pacienteSearchResults.map((paciente) => (
                              <button
                                key={paciente.id}
                                onClick={() => handlePacienteFilterSelect(paciente)}
                                className="w-full px-3 py-2 text-left hover:bg-[#2A4A4A] text-white text-sm"
                              >
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2 text-[#F1C77A]" />
                                  <div>
                                    <div className="font-medium">{paciente.nombreCompleto}</div>
                                    {paciente.persona?.dni && (
                                      <div className="text-xs text-gray-400">DNI: {paciente.persona.dni}</div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleApplyGeneralSearch}
                      className="bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    
                    {(selectedPacienteFilterPsicologo || filtersPsicologo.pacienteQuery || filtersPsicologo.etiquetaQuery) && (
                      <Button
                        onClick={clearPacienteFilter}
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Filtro por etiqueta (RF 2.1) */}
                  <div className="mt-4">
                    <Label htmlFor="etiqueta-filter" className="text-gray-300 mb-2 block">
                      Filtrar por Etiqueta
                    </Label>
                    <Input
                      id="etiqueta-filter"
                      value={etiquetaInput}
                      onChange={(e) => setEtiquetaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyGeneralSearch(); }}
                      placeholder="Ej: ansiedad, seguimiento..."
                      className="bg-[#152A2A] border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>

                  {selectedPacienteFilterPsicologo && (
                    <div className="mt-2">
                      <Badge className="bg-[#F1C77A] text-[#1D3434]">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Filtrando por: {selectedPacienteFilterPsicologo.nombreCompleto}
                      </Badge>
                    </div>
                  )}
                  {filtersPsicologo.etiquetaQuery && (
                    <div className="mt-2">
                      <Badge className="bg-[#F1C77A] text-[#1D3434]">
                        Etiqueta: {filtersPsicologo.etiquetaQuery}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Results Summary */}
                <div className="mb-4 flex items-center justify-between">
                  <TypographyP className="text-gray-300">
                    {paginationPsicologo.totalItems} informe(s) encontrado(s)
                  </TypographyP>
                  
                  <Button
                    onClick={() => router.push('/informes/registrar')}
                    className="bg-primary !text-primary-foreground text-white hover:bg-primary/90"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Informe
                  </Button>
                </div>

                {/* Informes Table */}
                {renderInformesTable(informesPsicologo, isLoadingPsicologo, errorPsicologo, 'psicologo')}

                {/* Pagination */}
                {!isLoadingPsicologo && !errorPsicologo && paginationPsicologo.totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    {renderPaginationControls(paginationPsicologo, handlePageChangePsicologo)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Patient View */}
        {userRoles.isPaciente && (
          <div className="mb-8">
            <Card className="mb-6" style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="w-6 h-6 mr-2 text-[#F1C77A]" />
                  Vista del Paciente
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Informes creados para usted por sus psicólogos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Results Summary */}
                <div className="mb-4">
                  <TypographyP className="text-gray-300">
                    {paginationPaciente.totalItems} informe(s) disponible(s)
                  </TypographyP>
                </div>

                {/* Informes Table */}
                {renderInformesTable(informesPaciente, isLoadingPaciente, errorPaciente, 'paciente')}

                {/* Pagination */}
                {!isLoadingPaciente && !errorPaciente && paginationPaciente.totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    {renderPaginationControls(paginationPaciente, handlePageChangePaciente)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Role Message */}
        {!userRoles.isPsicologo && !userRoles.isPaciente && (
          <Card style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
            <CardContent className="pt-10 pb-10 text-center">
              <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
              <TypographyP className="text-gray-400">
                No se ha asignado un perfil específico a su cuenta. Contacte al administrador.
              </TypographyP>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

                    