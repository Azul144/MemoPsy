// app/welcome/page.tsx
// app/welcome/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Menu, X, Users, Calendar, FileText, LogOut, Settings, Shield, HomeIcon } from 'lucide-react';

interface ModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: any;
  ruta: string;
  permisosRequeridos: string[]; // Cambiado a array de permisos específicos
}

const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    descripcion: 'Gestión de usuarios del sistema',
    icon: Users,
    ruta: '/usuarios',
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
    descripcion: 'Administración de perfiles',
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

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.permisos) {
      // Obtener nombres de permisos del usuario
      const permisosUsuario = session.user.permisos.map((permiso: any) => permiso.nombre);
      
      // Filtrar módulos basado en si el usuario tiene al menos uno de los permisos requeridos
      const modulosConPermiso = MODULOS_DISPONIBLES.filter(modulo => {
        return modulo.permisosRequeridos.some(permisoRequerido => 
          permisosUsuario.includes(permisoRequerido)
        );
      });
      
      setModulosPermitidos(modulosConPermiso);
    }
  }, [session]);

  const handleLogout = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navigateToModule = (ruta: string) => {
    router.push(ruta);
    setIsMenuOpen(false);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const nombreCompleto = session.user.persona 
    ? `${session.user.persona.nombre} ${session.user.persona.apellido}` 
    : 'Usuario';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#152A2A' }}>
      {/* Navigation Bar */}
      <nav className="w-full p-4" style={{ backgroundColor: '#1D3434' }}>
        <div className="flex items-center justify-between">
          {/* Logo y título */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10">
              <MemopsyLogo />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#F1C77A' }}>
              MemoPsy
            </h1>
          </div>

          {/* Menu hamburguesa */}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: '#152A2A' }}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Menu desplegable */}
        {isMenuOpen && (
          <div className="absolute top-16 right-4 w-64 rounded-lg shadow-lg z-50" style={{ backgroundColor: '#1D3434' }}>
            <div className="p-4 border-b border-gray-600">
              <p className="text-sm text-gray-300">Conectado como:</p>
              <p className="font-semibold text-white">{session.user.email}</p>
              <p className="text-sm" style={{ color: '#F1C77A' }}>{nombreCompleto}</p>
            </div>
            
            {/* Módulos disponibles */}
            <div className="p-2">
              <h3 className="px-2 py-1 text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Módulos
              </h3>
              {modulosPermitidos.length > 0 ? (
                modulosPermitidos.map((modulo) => {
                  const IconComponent = modulo.icon;
                  return (
                    <button
                      key={modulo.id}
                      onClick={() => navigateToModule(modulo.ruta)}
                      className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "#152A2A")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "transparent")}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      <div>
                        <div className="font-medium">{modulo.nombre}</div>
                        <div className="text-xs text-gray-400">{modulo.descripcion}</div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="px-2 py-2 text-sm text-gray-400">
                  No tienes permisos para ningún módulo
                </p>
              )}
            </div>

            {/* Opciones adicionales */}
            <div className="p-2 border-t border-gray-600">
              <button
              onClick={() => {
                router.push("/welcome");
              }}
              className="w-full flex items-center px-2 py-2 text-left text-white hover:bg-opacity-80 rounded-lg transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "#152A2A")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "transparent")}
              >
              <HomeIcon className="w-5 h-5 mr-3" />
              Home
              </button>


              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-2 py-2 text-left text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#F1C77A' }}>
            ¡Bienvenida/o, {nombreCompleto}!
          </h1>
          <p className="text-xl text-gray-300">
            Sistema de Gestión MemoPsy
          </p>
        </div>

        {/* Cards de módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modulosPermitidos.map((modulo) => {
            const IconComponent = modulo.icon;
            return (
              <div
                key={modulo.id}
                className="p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                style={{ backgroundColor: '#1D3434' }}
                onClick={() => navigateToModule(modulo.ruta)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-4 rounded-full mb-4" style={{ backgroundColor: '#152A2A' }}>
                    <IconComponent className="w-8 h-8" style={{ color: '#F1C77A' }} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {modulo.nombre}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {modulo.descripcion}
                  </p>
                  <Button
                    variant="outline"
                      className="w-full py-3 text-lg"
                      style={{ 
                        borderColor: '#F1C77A',
                        color: '#F1C77A',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = '#F1C77A';
                        (e.target as HTMLElement).style.color = '#1D3434';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                        (e.target as HTMLElement).style.color = '#F1C77A';
                      }}
                    >
                    Acceder
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mensaje si no hay módulos disponibles */}
        {modulosPermitidos.length === 0 && (
          <div className="text-center mt-12">
            <div className="p-8 rounded-2xl" style={{ backgroundColor: '#1D3434' }}>
              <h3 className="text-xl font-semibold text-white mb-4">
                Sin módulos disponibles
              </h3>
              <p className="text-gray-300">
                No tienes permisos para acceder a ningún módulo del sistema.
                Contacta al administrador para solicitar acceso.
              </p>
            </div>
          </div>
        )}

        {/* Información del usuario */}
        <div className="mt-12 max-w-md mx-auto">
          <div className="p-6 rounded-2xl" style={{ backgroundColor: '#1D3434' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F1C77A' }}>
              Información de tu cuenta
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Email:</span>
                <span className="text-white">{session.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Estado:</span>
                <span className={session.user.activo ? "text-green-400" : "text-red-400"}>
                  {session.user.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Perfiles:</span>
                <span className="text-white">
                  {session.user.perfiles?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Permisos:</span>
                <span className="text-white">
                  {session.user.permisos?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
/*
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si no hay sesión activa, redirigir al login
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [session, status]);

  // Redirigir a páginas específicas según el rol
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // Función para manejar cerrar sesión
  const handleLogout = async () => {
    router.push('/api/auth/signout');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg text-center">
        <MemopsyLogo />
        <h1 className="text-3xl font-bold mt-6 mb-2">¡Bienvenido/a a Memopsy!</h1>
        
        {session?.user && (
          <div className="mt-4 mb-6">
            <p className="text-xl mb-1">Hola, {session.user.name || session.user.email}</p>
            <p className="text-gray-600">
              {session.user.esAdmin ? 'Acceso de Administrador' : 'Acceso de Usuario'}
            </p>
          </div>
        )}

        <div className="space-y-4 mt-8">
          {/*}
          <Button onClick={goToDashboard} className="w-full py-6 text-lg">
            Ir al Panel Principal
          </Button> -->
          }

          {session?.user?.esAdmin && (
            <>
              {/*}
              <Button 
                onClick={() => router.push('/admin')} 
                variant="outline" 
                className="w-full py-6 text-lg"
              >
                Panel de Administración
              </Button>
              }
              {/* Nuevos botones para registrar usuarios, pacientes y psicólogos }
              <div className="grid grid-cols-1 gap-3 mt-4">
                <h2 className="text-lg font-semibold">Módulo de Usuarios</h2>
                <Button 
                  onClick={() => router.push('/register')} 
                  variant="outline" 
                  className="w-full py-5"
                >
                  Registrar Empleado
                </Button>
                <Button 
                  onClick={() => router.push('/register/paciente')} 
                  variant="outline" 
                  className="w-full py-5"
                >
                  Registrar Paciente
                </Button>
                <Button 
                  onClick={() => router.push('/register/psicologo')} 
                  variant="outline" 
                  className="w-full py-5"
                >
                  Registrar Psicólogo
                </Button>
              </div>
            </>
          )}

          {session?.user?.esAdmin && (
            <>
              <div className="grid grid-cols-1 gap-3 mt-4">
                <h2 className="text-lg font-semibold">Módulo de Permisos</h2>
                <Button 
                  onClick={() => router.push('/profile/crear')} 
                  variant="outline" 
                  className="w-full py-5"
                >
                  Personalización de Perfiles
                </Button>
                <Button 
                  onClick={() => router.push('/profile/asignar')} 
                  variant="outline" 
                  className="w-full py-5"
                >
                  Asignación de Perfiles
                </Button>
              </div>
            </>
          )}
          
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full py-6 text-lg mt-6"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

*/