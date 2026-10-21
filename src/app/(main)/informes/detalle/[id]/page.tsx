//src/app/(main)/informes/detalle/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import { useRouter, useParams } from 'next/navigation';
import MemopsyLogo from '@/app/components/MemopsyLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TypographyH1, TypographyH2, TypographyP, TypographySmall, TypographyMuted } from '@/components/ui/typography';
import { FileText as PageIcon, User, Users, CalendarDays, Lock, Unlock, Loader2, AlertTriangle, Edit, Download } from "lucide-react"
import { avisoError } from "@/lib/avisos";

// Interfaces
interface PsicologoDetalle {
  id: string;
  nombre: string;
}

interface PacienteDetalle {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
}

interface InformeDetalle {
  id: string;
  titulo: string;
  contenido: string;
  etiquetas?: string | null;
  fechaCreacion: string;
  esPrivado: boolean;
  psicologo: PsicologoDetalle | null;
  pacientes: PacienteDetalle[];
}



export default function DetalleInformePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  // Navbar states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [nombreCompletoNav, setNombreCompletoNav] = useState('');
  const [loadingPermissions, setLoadingPermissions] = useState(true);


  // Page specific states
  const [informe, setInforme] = useState<InformeDetalle | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Renamed for clarity
  const [pageError, setPageError] = useState<string | null>(null); // Renamed for clarity
  const [canEdit, setCanEdit] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  // RF 2.5 - El PDF se genera en el servidor en el momento y se descarga; no queda guardado
  const descargarPdf = async () => {
    if (!informe) return;
    setDescargandoPdf(true);
    try {
      const res = await fetch(`/api/informes/${informe.id}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        avisoError(data?.error || "No se pudo generar el PDF.");
        return;
      }
      const nombre = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `informe-${informe.id}.pdf`;
      const url = URL.createObjectURL(await res.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      avisoError("No se pudo descargar el PDF. Verificá tu conexión.");
    } finally {
      setDescargandoPdf(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
        // Navbar permissions
        const userPermissions = session.user.permisos.map((p: any) => p.nombre);;
        const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
            module.permisosRequeridos.some(pr => userPermissions.includes(pr))
        );
        setModulosPermitidos(filteredMainModules);
        setNombreCompletoNav(session.user.persona?.nombreCompleto || session.user.email || 'Usuario');
        setLoadingPermissions(false); // Navbar permissions loaded

        // Page content fetching
        if (id) {
            setIsLoadingData(true);
            fetch(`/api/informes/${id}`)
            .then(async (res) => {
                if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `Error ${res.status}: ${res.statusText}` }));
                throw new Error(errorData.message || `Error ${res.status}`);
                }
                return res.json();
            })
            .then((data: InformeDetalle) => {
                setInforme(data);
                setPageError(null);
                if (session?.user?.psicologoId && data.psicologo?.id === session.user.psicologoId && userPermissions.includes('Editar Informe')) {
                    setCanEdit(true);
                }
            })
            .catch((err) => {
                console.error("Error fetching informe:", err);
                setPageError(err.message);
                setInforme(null);
            })
            .finally(() => {
                setIsLoadingData(false);
            });
        } else {
            setPageError("ID del informe no encontrado en la URL.");
            setIsLoadingData(false);
            setLoadingPermissions(false); // Also set this if ID is missing
        }
    } else if (status === 'loading') {
        // Keep loadingPermissions true while session is loading
        setLoadingPermissions(true);
        setIsLoadingData(true);
    }
  }, [id, status, session, router]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => { router.push(ruta); setIsMenuOpen(false); };
  const handleLogout = async () => { await cerrarSesion(); };


  if (loadingPermissions || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
        <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
        <TypographyP className="text-white">Cargando datos...</TypographyP>
      </div>
    );
  }
  
  // Unauthenticated case is handled by useEffect redirect

  return (
    <div className="min-h-screen">

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Detalle del informe" volverA="/informes/lista" textoVolver="Volver a la lista de informes" />

        {pageError && (
            <Card className="border-red-400/40 bg-red-500/10 text-red-300 max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-red-400" /> Error al Cargar el Informe
                </CardTitle>
            </CardHeader>
            <CardContent>
                <TypographyP>{pageError}</TypographyP>
                <TypographySmall>Por favor, intente nuevamente o contacte soporte si el problema persiste.</TypographySmall>
            </CardContent>
            </Card>
        )}

        {!pageError && !informe && !isLoadingData && ( // Should only show if not loading and no error, but informe is still null
            <Card style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }} className="max-w-3xl mx-auto text-center">
            <CardHeader>
                <CardTitle className="text-[#F1C77A]">Informe no Disponible</CardTitle>
            </CardHeader>
            <CardContent>
                <TypographyP className="text-gray-300">No se pudo cargar la información del informe.</TypographyP>
            </CardContent>
            </Card>
        )}

        {informe && (
          <Card className="shadow-lg max-w-3xl mx-auto" style={{ backgroundColor: '#1D3434', borderColor: '#2A4A4A' }}>
            <CardHeader className="p-6 border-b border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    {/* Ícono en recuadro, del alto de la primera línea del título */}
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1C77A]/15 lg:mt-1 lg:h-14 lg:w-14">
                        <PageIcon className="h-6 w-6 text-[#F1C77A] lg:h-8 lg:w-8" />
                    </span>
                    <TypographyH1 className="text-3xl font-semibold text-white">{informe.titulo}</TypographyH1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={descargarPdf} disabled={descargandoPdf} variant="outline"
                      className="border-[#F1C77A] text-[#F1C77A] hover:bg-[#F1C77A]/10">
                      {descargandoPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Descargar PDF
                  </Button>
                  {canEdit && (
                      <Button onClick={() => router.push(`/informes/editar/${informe.id}`)}
                          className="bg-[#F1C77A] text-[#1D3434] hover:bg-opacity-80">
                          <Edit className="mr-2 h-4 w-4" /> Editar Informe
                      </Button>
                  )}
                </div>
              </div>
              <CardDescription className="text-gray-400 mt-2">
                ID del Informe: <TypographyMuted className="text-gray-500">{informe.id}</TypographyMuted>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label htmlFor="contenido" className="text-lg font-medium text-gray-200">Contenido del Informe</Label>
                <div 
                  id="contenido" 
                  className="mt-2 p-4 border rounded-md bg-[#152A2A] border-gray-700 whitespace-pre-wrap min-h-[150px] text-gray-300"
                >
                  {informe.contenido}
                </div>
              </div>

              {informe.etiquetas && informe.etiquetas.trim() && (
                <div>
                  <Label className="text-lg font-medium text-gray-200">Etiquetas</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {informe.etiquetas.split(',').map((e) => e.trim()).filter(Boolean).map((etiqueta, i) => (
                      <Badge key={i} className="text-sm px-3 py-1 bg-[#F1C77A] !text-[#1D3434] hover:bg-[#F1C77A]/90">
                        {etiqueta}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-gray-300">
                    <CalendarDays className="mr-2 h-5 w-5 text-[#F1C77A]" />
                    <Label className="font-semibold text-gray-200">Fecha de Creación:</Label>
                  </div>
                  <TypographyP className="ml-7 text-gray-300">{new Date(informe.fechaCreacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TypographyP>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-gray-300">
                    <User className="mr-2 h-5 w-5 text-[#F1C77A]" />
                    <Label className="font-semibold text-gray-200">Psicólogo:</Label>
                  </div>
                  <TypographyP className="ml-7 text-gray-300">{informe.psicologo?.nombre || 'No especificado'}</TypographyP>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center text-gray-300">
                    {informe.esPrivado ? <Lock className="mr-2 h-5 w-5 text-red-500" /> : <Unlock className="mr-2 h-5 w-5 text-green-500" />}
                    <Label className="font-semibold text-gray-200">Privacidad:</Label>
                  </div>
                  <TypographyP className="ml-7 text-gray-300">{informe.esPrivado ? 'Privado (Solo visible para el psicólogo)' : 'No Privado (Visible para pacientes asociados)'}</TypographyP>
                </div>
              </div>
              
              <div>
                <div className="flex items-center text-gray-300 mb-2">
                    <Users className="mr-2 h-5 w-5 text-[#F1C77A]" />
                    <Label className="text-lg font-medium text-gray-200">Pacientes Asociados:</Label>
                </div>
                {informe.pacientes && informe.pacientes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {informe.pacientes.map(paciente => (
                      <Badge key={paciente.id} className="text-sm px-3 py-1 bg-primary !text-primary-foreground hover:bg-primary/90 text-white">
                        {paciente.nombre} {paciente.apellido} (DNI: {paciente.dni || 'N/A'})
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <TypographyP className="ml-7 text-gray-400">Ninguno</TypographyP>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-[#152A2A] border-t border-gray-700 rounded-b-lg text-center mt-4">
                <TypographySmall className="text-gray-500">Fin del detalle del informe.</TypographySmall>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
