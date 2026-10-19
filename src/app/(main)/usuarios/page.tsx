'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { cerrarSesion } from "@/lib/auth/cerrar-sesion";
import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import TarjetaAccion from "@/components/sistema/TarjetaAccion";
import { useRouter } from 'next/navigation';
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Menu, X, Users, UserPlus, List, Edit3, UserCog, Calendar, FileText, HomeIcon, Shield, LogOut } from 'lucide-react';

interface SubModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: any; // Lucide icon component
  ruta: string;
  permisoRequerido: string;
}

const SUB_MODULOS_USUARIOS: SubModuloConfig[] = [
  {
    id: 'registrar_usuario',
    nombre: 'Registrar Nuevo Usuario',
    descripcion: 'Crear cuentas para nuevos usuarios en el sistema.',
    icon: UserPlus,
    ruta: '/usuarios/registrar', // Assuming routes under /usuarios for submodules
    permisoRequerido: 'Registrar Usuario',
  },
  {
    id: 'listar_usuarios',
    nombre: 'Ver Lista de Usuarios',
    descripcion: 'Consultar y navegar el listado de todos los usuarios.',
    icon: List,
    ruta: '/usuarios/listar',
    permisoRequerido: 'Ver Usuarios',
  },
  {
    id: 'editar_usuario_general',
    nombre: 'Editar Usuarios',
    descripcion: 'Modificar información y perfiles de usuarios existentes (desde la lista).',
    icon: Edit3,
    ruta: '/usuarios/listar', 
    permisoRequerido: 'Editar Usuario',
  },
  {
    id: 'gestionar_estado_usuario_general',
    nombre: 'Activar/Desactivar Usuarios',
    descripcion: 'Cambiar el estado de actividad de las cuentas de usuario (desde la lista).',
    icon: UserCog, 
    ruta: '/usuarios/listar', 
    permisoRequerido: 'Eliminar Usuario',
  },
];

// Copied from app/(auth)/welcome/page.tsx and adapted for main navigation
interface ModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: any;
  ruta: string;
  permisosRequeridos: string[];
}

const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    descripcion: 'Gestión de usuarios del sistema',
    icon: Users,
    ruta: '/usuarios', // Corrected path for main module
    permisosRequeridos: ['Ver Usuarios', 'Registrar Usuario', 'Editar Usuario', 'Eliminar Usuario']
  },
  {
    id: 'sesiones',
    nombre: 'Sesiones',
    descripcion: 'Administración de sesiones',
    icon: Calendar,
    ruta: '/sesiones',
    permisosRequeridos: ['Ver Sesiones', 'Registrar Sesión', 'Editar Sesión', 'Eliminar Sesión', 'Asignar Profesional']
  },
  {
    id: 'perfiles',
    nombre: 'Perfiles',
    descripcion: 'Administración de perfiles y roles',
    icon: Shield,
    ruta: '/perfiles',
    permisosRequeridos: ['Ver Perfiles', 'Registrar Perfil', 'Editar Perfil', 'Eliminar Perfil', 'Asignar Perfil']
  },
  {
    id: 'informes',
    nombre: 'Informes',
    descripcion: 'Generación de reportes',
    icon: FileText,
    ruta: '/informes',
    permisosRequeridos: ['Ver Informes', 'Registrar Informe', 'Editar Informe', 'Eliminar Informe']
  }
];


export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);
  const [subModulosUsuariosPermitidos, setSubModulosUsuariosPermitidos] = useState<SubModuloConfig[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login'); // Adjusted redirect to /login as per typical auth flow
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);

      // Filter main modules for sidebar
      const filteredMainModules = MODULOS_DISPONIBLES.filter(module =>
        module.permisosRequeridos.some(pr => userPermissions.includes(pr))
      );
      setModulosPermitidos(filteredMainModules);

      // Filter sub-modules for Usuarios page cards
      const filteredSubModules = SUB_MODULOS_USUARIOS.filter(subModule =>
        userPermissions.includes(subModule.permisoRequerido)
      );
      setSubModulosUsuariosPermitidos(filteredSubModules);
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    // Should be handled by the useEffect redirect, but as a fallback
    return null; 
  }
  
  const nombreCompleto = session.user.persona
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}`
    : session.user.email || 'Usuario';


  return (
    <div className="min-h-screen">

      {/* Main Content for Usuarios */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Gestión de Usuarios" descripcion="Administra las cuentas y perfiles de los usuarios del sistema." volverA="/welcome" textoVolver="Volver al inicio" />

        {/* Cards Grid for Sub-modules */}
        {subModulosUsuariosPermitidos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {subModulosUsuariosPermitidos.map((subModulo, i) => (
              <TarjetaAccion key={subModulo.id} icono={subModulo.icon} titulo={subModulo.nombre} descripcion={subModulo.descripcion} href={subModulo.ruta} orden={i} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#1D3434' }}>
              <Users className="w-16 h-16 mx-auto mb-6" style={{ color: '#F1C77A' }}/>
              <h3 className="text-2xl font-semibold text-white mb-4">
                Sin Acciones Disponibles en Usuarios
              </h3>
              <p className="text-gray-300">
                No tienes los permisos necesarios para realizar acciones en el módulo de usuarios. 
                Si crees que esto es un error, por favor contacta al administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
