'use client';

import { useState, useEffect } from 'react';
import { MODULOS_DISPONIBLES, type ModuloConfig } from "@/config/modulos";
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import TarjetaAccion from "@/components/sistema/TarjetaAccion";
import { useRouter } from 'next/navigation';
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { TypographyP } from '@/components/ui/typography';
import { Menu, Loader2, X, Users, UserPlus, List, Edit3, Shield, LogOut, FileText, Calendar, HomeIcon } from 'lucide-react'; // Added ShieldPlus, Settings2

interface SubModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: any; // Lucide icon component
  ruta: string;
  permisoRequerido: string;
}

const SUB_MODULOS_PERFILES: SubModuloConfig[] = [
  {
    id: 'registrar_perfil',
    nombre: 'Registrar Nuevo Perfil',
    descripcion: 'Crear nuevos perfiles de usuario.',
    icon: UserPlus, // Using UserPlus, could be ShieldPlus if more appropriate
    ruta: '/perfiles/registrar',
    permisoRequerido: 'Registrar Perfil',
  },
  {
    id: 'listar_perfiles',
    nombre: 'Ver Lista de Perfiles',
    descripcion: 'Consultar y navegar el listado de todos los perfiles.',
    icon: List,
    ruta: '/perfiles/listar',
    permisoRequerido: 'Ver Perfiles',
  },
  {
    id: 'editar_usuario_general',
    nombre: 'Editar Usuarios',
    descripcion: 'Modificar información y perfiles de usuarios existentes (desde la lista).',
    icon: Edit3,
    ruta: '/usuarios/listar', 
    permisoRequerido: 'Editar Usuario',
  },
];

// Copied from app/(auth)/welcome/page.tsx and adapted for main navigation

// This list is typically shared or fetched, here for structural context from usuarios/page.tsx


export default function PerfilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [subModulosPerfilesPermitidos, setSubModulosPerfilesPermitidos] = useState<SubModuloConfig[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);

      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermissions.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);

      const filteredSubModules = SUB_MODULOS_PERFILES.filter(subModule =>
        userPermissions.includes(subModule.permisoRequerido)
      );
      setSubModulosPerfilesPermitidos(filteredSubModules);
    }
  }, [session]);

  const handleLogout = async () => {
    await cerrarSesion();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navigateToModule = (ruta: string) => {
    router.push(ruta);
    setIsMenuOpen(false); 
  };

  const navigateToSubModulo = (ruta: string) => {
    router.push(ruta);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#152A2A' }}>
            <Loader2 className="h-16 w-16 animate-spin text-[#F1C77A] mb-4" />
            <TypographyP className="text-white">Cargando...</TypographyP>
        </div>
    );
  }

  if (!session) {
    return null; 
  }
  
  const nombreCompleto = session.user.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session.user.email || 'Usuario';


  return (
    <div className="min-h-screen">

      {/* Main Content for Perfiles */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Gestión de Perfiles" descripcion="Administra los perfiles de usuario y sus permisos asociados en el sistema." volverA="/welcome" textoVolver="Volver al inicio" />

        {/* Cards Grid for Sub-modules */}
        {subModulosPerfilesPermitidos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {subModulosPerfilesPermitidos.map((subModulo, i) => (
              <TarjetaAccion key={subModulo.id} icono={subModulo.icon} titulo={subModulo.nombre} descripcion={subModulo.descripcion} href={subModulo.ruta} orden={i} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#1D3434' }}>
              <Shield className="w-16 h-16 mx-auto mb-6" style={{ color: '#F1C77A' }}/> {/* Icon for Perfiles */}
              <h3 className="text-2xl font-semibold text-white mb-4">
                Sin Acciones Disponibles en Perfiles
              </h3>
              <p className="text-gray-300">
                No tienes los permisos necesarios para realizar acciones en el módulo de perfiles. 
                Si crees que esto es un error, por favor contacta al administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
