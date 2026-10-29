//src/app/(main)/informes/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import EncabezadoPagina from "@/components/sistema/EncabezadoPagina";
import TarjetaAccion from "@/components/sistema/TarjetaAccion";
import { useRouter } from 'next/navigation';
import { TypographyP } from '@/components/ui/typography';
import { FileText, PlusSquare, ListChecks, Loader2, ClipboardCheck, BookOpen } from "lucide-react"

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
    nombre: 'Registrar nota clínica',
    descripcion: 'Escribí o dictá la nota de una sesión; la IA te ayuda a ordenarla.',
    icon: PlusSquare,
    ruta: '/informes/registrar',
    permisoRequerido: 'Registrar Informe',
  },
  {
    id: 'listar_informes',
    nombre: 'Notas clínicas',
    descripcion: 'Buscá tus notas por paciente, etiqueta o palabra clave.',
    icon: ListChecks,
    ruta: '/informes/lista',
    permisoRequerido: 'Ver Informes',
  },
  {
    // Historia clínica del paciente (Ley 26.529): admisión, evolución y cierre, con descarga en PDF foliado
    id: 'historias_clinicas',
    nombre: 'Historias clínicas',
    descripcion: 'Completá la historia clínica de cada paciente y descargala en PDF.',
    icon: BookOpen,
    ruta: '/informes/historias',
    permisoRequerido: 'Registrar Informe',
  },
  {
    // RF 2.4 - El paciente no ve las notas clínicas (son del psicólogo): ve sus informes de seguimiento
    id: 'mis_seguimientos',
    nombre: 'Mis informes de seguimiento',
    descripcion: 'Lo que trabajaste en cada sesión, tus actividades y las pautas de tu psicólogo/a.',
    icon: ClipboardCheck,
    ruta: '/informes/seguimiento',
    permisoRequerido: 'Ver Informes',
  },
];

export default function GestionInformesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State variables (identical to perfiles/page.tsx)
  const [subModulosInformesPermitidos, setSubModulosInformesPermitidos] = useState<SubModuloConfig[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true); // To manage initial load

  // useEffect for session and permissions (identical logic to perfiles/page.tsx)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const userPermissions = session.user.permisos.map((p: any) => p.nombre);
      

      // Specific logic for Informes sub-modules
      const filteredSubModules = SUB_MODULOS_INFORMES.filter(subModule => {
        if (subModule.id === 'registrar_informe') {
          return userPermissions.includes(subModule.permisoRequerido) && !!session.user.psicologoId;
        }
        if (subModule.id === 'historias_clinicas') {
          return userPermissions.includes(subModule.permisoRequerido) && !!session.user.psicologoId;
        }
        if (subModule.id === 'mis_seguimientos') {
          return userPermissions.includes(subModule.permisoRequerido) && !!session.user.pacienteId;
        }
        // La lista de notas clínicas no es para el paciente
        if (subModule.id === 'listar_informes' && session.user.pacienteId && !session.user.psicologoId) {
          return false;
        }
        return userPermissions.includes(subModule.permisoRequerido);
      });
      setSubModulosInformesPermitidos(filteredSubModules);
      
      setLoadingPermissions(false);
    } else if (status === 'loading') {
        setLoadingPermissions(true); // Ensure loading state while session is resolving
    }
  }, [session, status, router]);

  // Utility functions (identical to perfiles/page.tsx)

  // Loading state (identical to perfiles/page.tsx)
  if (loadingPermissions) { // Combines session loading and permission processing
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: "var(--background)" }}>
        <Loader2 className="h-16 w-16 animate-spin text-dorado mb-4" />
        <TypographyP className="text-foreground">Cargando...</TypographyP>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">

      {/* Main Content (structure identical to perfiles/page.tsx) */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <EncabezadoPagina titulo="Gestión de Informes" descripcion="Registrá y consultá notas clínicas, historias clínicas e informes de seguimiento." volverA="/welcome" textoVolver="Volver al inicio" />

        {status === 'authenticated' && subModulosInformesPermitidos.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: "var(--card)" }}>
            <FileText className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--dorado)" }} /> {/* Using FileText as a general icon for Informes module */}
            <h3 className="text-2xl font-semibold text-foreground mb-4">Sin Acciones Disponibles en Informes</h3>
            <TypographyP className="text-suave">
              No tenés los permisos necesarios para usar este módulo.
              Si creés que es un error, consultá con el administrador del sistema.
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
