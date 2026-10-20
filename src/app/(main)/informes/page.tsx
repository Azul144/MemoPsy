//src/app/(main)/informes/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import TarjetaAccion from "@/components/sistema/TarjetaAccion";
import { useRouter } from 'next/navigation';
import MemopsyLogo from '@/app/components/MemopsyLogo';
import { Button } from '@/components/ui/button';
import { TypographyH1, TypographyP } from '@/components/ui/typography';
import { FileText, PlusSquare, ListChecks, Loader2 } from "lucide-react"

// Interfaces (identical to perfiles/page.tsx)

interface SubModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ElementType;
  ruta: string;
  permisoRequerido: string;
}

// MODULOS_DISPONIBLES (identical to perfiles/page.tsx, FileText used for Informes)

// SUB_MODULOS_INFORMES (specific to this page)
const SUB_MODULOS_INFORMES: SubModuloConfig[] = [
  {
    id: 'registrar_informe',
    nombre: 'Registrar Nuevo Informe',
    descripcion: 'Crear nuevos informes clínicos para pacientes.',
    icon: PlusSquare,
    ruta: '/informes/registrar',
    permisoRequerido: 'Registrar Informe',
  },
  {
    id: 'listar_informes',
    nombre: 'Ver Lista de Informes',
    descripcion: 'Consultar y gestionar el listado de informes existentes.',
    icon: ListChecks,
    ruta: '/informes/lista',
    permisoRequerido: 'Ver Informes',
  },
];


export default function GestionInformesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State variables (identical to perfiles/page.tsx)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [subModulosInformesPermitidos, setSubModulosInformesPermitidos] = useState<SubModuloConfig[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true); // To manage initial load

  // useEffect for session and permissions (identical logic to perfiles/page.tsx)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);
      
      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermissions.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);

      // Specific logic for Informes sub-modules
      const filteredSubModules = SUB_MODULOS_INFORMES.filter(subModule => {
        if (subModule.id === 'registrar_informe') {
          return userPermissions.includes(subModule.permisoRequerido) && !!session.user.psicologoId;
        }
        return userPermissions.includes(subModule.permisoRequerido);
      });
      setSubModulosInformesPermitidos(filteredSubModules);
      
      setNombreCompleto(session.user.persona?.nombreCompleto || session.user.email || 'Usuario');
      setLoadingPermissions(false);
    } else if (status === 'loading') {
        setLoadingPermissions(true); // Ensure loading state while session is resolving
    }
  }, [session, status, router]);

  // Utility functions (identical to perfiles/page.tsx)
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navigateToModule = (ruta: string) => {
    router.push(ruta);
    setIsMenuOpen(false);
  };

  const navigateToSubModulo = (ruta: string) => {
    router.push(ruta);
  };

  const handleLogout = async () => {
    await cerrarSesion();
  };

  // Loading state (identical to perfiles/page.tsx)
  if (loadingPermissions) { // Combines session loading and permission processing
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
        <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
        <TypographyP className="text-white">Cargando...</TypographyP>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">

      {/* Main Content (structure identical to perfiles/page.tsx) */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Gestión de Informes" descripcion="Accede a las funciones de registro y consulta de informes." volverA="/welcome" textoVolver="Volver al inicio" />

        {status === 'authenticated' && subModulosInformesPermitidos.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#1D3434' }}>
            <FileText className="w-16 h-16 mx-auto mb-6" style={{ color: '#F1C77A' }} /> {/* Using FileText as a general icon for Informes module */}
            <h3 className="text-2xl font-semibold text-white mb-4">Sin Acciones Disponibles en Informes</h3>
            <TypographyP className="text-gray-300">
              No tienes los permisos necesarios para realizar acciones en este módulo.
              Si crees que esto es un error, por favor contacta al administrador del sistema.
            </TypographyP>
          </div>
        )}

        {status === 'authenticated' && subModulosInformesPermitidos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {subModulosInformesPermitidos.map((subModulo, i) => (
              <TarjetaAccion key={subModulo.id} icono={subModulo.icon} titulo={subModulo.nombre} descripcion={subModulo.descripcion} href={subModulo.ruta} orden={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
