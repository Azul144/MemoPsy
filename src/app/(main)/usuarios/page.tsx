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
import { Users, UserPlus, List, Edit3, UserCog } from "lucide-react"

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
    nombre: 'Registrar usuario',
    descripcion: 'Creá la cuenta de un profesional, un paciente o alguien del equipo.',
    icon: UserPlus,
    ruta: '/usuarios/registrar',
    permisoRequerido: 'Registrar Usuario',
  },
  {
    id: 'listar_usuarios',
    nombre: 'Usuarios',
    descripcion: 'Consultá las cuentas, editá sus datos y su perfil, y activalas o desactivalas.',
    icon: List,
    ruta: '/usuarios/listar',
    permisoRequerido: 'Ver Usuarios',
  },
];

// Copied from app/(auth)/welcome/page.tsx and adapted for main navigation



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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-foreground text-lg">Cargando...</div>
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
        <EncabezadoPagina titulo="Gestión de Usuarios" descripcion="Cuentas de usuario y sus perfiles." volverA="/welcome" textoVolver="Volver al inicio" />

        {/* Cards Grid for Sub-modules */}
        {subModulosUsuariosPermitidos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {subModulosUsuariosPermitidos.map((subModulo, i) => (
              <TarjetaAccion key={subModulo.id} icono={subModulo.icon} titulo={subModulo.nombre} descripcion={subModulo.descripcion} href={subModulo.ruta} orden={i} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
              <Users className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--dorado)" }}/>
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Sin Acciones Disponibles en Usuarios
              </h3>
              <p className="text-suave">
                No tenés los permisos necesarios para usar el módulo de usuarios. 
                Si creés que es un error, consultá con el administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
