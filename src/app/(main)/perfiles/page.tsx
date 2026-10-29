'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import TarjetaAccion from "@/components/sistema/TarjetaAccion";
import { useRouter } from 'next/navigation';
import { TypographyP } from '@/components/ui/typography';
import { Loader2, UserPlus, List, Edit3, Shield } from "lucide-react" // Added ShieldPlus, Settings2

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
    nombre: 'Registrar perfil',
    descripcion: 'Creá un perfil y elegí qué permisos tiene.',
    icon: UserPlus,
    ruta: '/perfiles/registrar',
    permisoRequerido: 'Registrar Perfil',
  },
  {
    id: 'listar_perfiles',
    nombre: 'Perfiles',
    descripcion: 'Consultá los perfiles y sus permisos, editalos o eliminalos.',
    icon: List,
    ruta: '/perfiles/listar',
    permisoRequerido: 'Ver Perfiles',
  },
  {
    id: 'asignar_perfil',
    nombre: 'Asignar perfil a un usuario',
    descripcion: 'Desde la lista de usuarios, editá la cuenta y elegí su perfil.',
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
  const [subModulosPerfilesPermitidos, setSubModulosPerfilesPermitidos] = useState<SubModuloConfig[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.permisos) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);

      const filteredSubModules = SUB_MODULOS_PERFILES.filter(subModule =>
        userPermissions.includes(subModule.permisoRequerido)
      );
      setSubModulosPerfilesPermitidos(filteredSubModules);
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: "var(--background)" }}>
            <Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" />
            <TypographyP className="text-foreground">Cargando...</TypographyP>
        </div>
    );
  }

  if (!session) {
    return null; 
  }
  

  return (
    <div className="min-h-screen">

      {/* Main Content for Perfiles */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Gestión de Perfiles" descripcion="Perfiles de usuario y los permisos de cada uno." volverA="/welcome" textoVolver="Volver al inicio" />

        {/* Cards Grid for Sub-modules */}
        {subModulosPerfilesPermitidos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {subModulosPerfilesPermitidos.map((subModulo, i) => (
              <TarjetaAccion key={subModulo.id} icono={subModulo.icon} titulo={subModulo.nombre} descripcion={subModulo.descripcion} href={subModulo.ruta} orden={i} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
              <Shield className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--dorado)" }}/> {/* Icon for Perfiles */}
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Sin Acciones Disponibles en Perfiles
              </h3>
              <p className="text-suave">
                No tenés los permisos necesarios para usar el módulo de perfiles. 
                Si creés que es un error, consultá con el administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
