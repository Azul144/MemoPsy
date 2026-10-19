// app/welcome/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import FondoAnimado from "@/components/FondoAnimado";
import { Button } from "@/components/ui/button";
import { Menu, X, Users, Calendar, FileText, LogOut, Shield, HomeIcon, KeyRound, Loader2, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import MfaSetupModal from "@/components/mfa-setup-modal"; // Import the MFA setup modal
import MfaDesactivarModal from "@/components/mfa-desactivar-modal";

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
    descripcion: 'Altas, datos y estado de las cuentas del consultorio',
    icon: Users,
    ruta: '/usuarios',
    permisosRequeridos: ['Ver Usuarios', 'Registrar Usuario', 'Editar Usuario', 'Eliminar Usuario']
  },
  {
    id: 'sesiones',
    nombre: 'Sesiones',
    descripcion: 'Agenda de turnos, presenciales y por videollamada',
    icon: Calendar,
    ruta: '/sesiones',
    permisosRequeridos: ['Ver Sesiones', 'Registrar Sesión', 'Editar Sesión', 'Eliminar Sesión', 'Asignar Profesional']
  },
  {
    id: 'perfiles',
    nombre: 'Perfiles',
    descripcion: 'Qué puede ver y hacer cada rol',
    icon: Shield,
    ruta: '/perfiles',
    permisosRequeridos: ['Ver Perfiles', 'Registrar Perfil', 'Editar Perfil', 'Eliminar Perfil', 'Asignar Perfil']
  },
  {
    id: 'informes',
    nombre: 'Informes',
    descripcion: 'Notas clínicas e informes de cada paciente',
    icon: FileText,
    ruta: '/informes',
    permisosRequeridos: ['Ver Informes', 'Registrar Informe', 'Editar Informe', 'Eliminar Informe']
  }
];

export default function WelcomePage() {
  const { data: session, status, update: updateSession } = useSession(); // Added updateSession
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuloConfig[]>([]);

  // MFA State
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null); // null initially, then boolean
  const [loadingMfaStatus, setLoadingMfaStatus] = useState(true);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isTogglingMfa, setIsTogglingMfa] = useState(false);
  const [isDesactivarOpen, setIsDesactivarOpen] = useState(false);


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

  // Fetch MFA status
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setLoadingMfaStatus(true);
      setMfaError(null);
      fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMfaEnabled(data.mfaEnabled);
          } else {
            console.error("Error fetching MFA status:", data.error);
            setMfaError("No se pudo verificar el estado de 2FA.");
            setMfaEnabled(false); // Default to false on error
          }
        })
        .catch((err) => {
          console.error("Error al verificar estado de 2FA:", err);
          setMfaError("Error de conexión al verificar 2FA.");
          setMfaEnabled(false); // Default to false on error
        })
        .finally(() => {
          setLoadingMfaStatus(false);
        });
    }
  }, [session, status, updateSession]); // updateSession added as dep

  const handleToggleMfa = () => {
    setMfaError(null);
    if (mfaEnabled) {
      // Desactivar: pide un código para confirmar
      setIsDesactivarOpen(true);
    } else {
      // Activar: abre la ventana con el QR
      setIsMfaModalOpen(true);
    }
  };

  const handleMfaSuccess = async () => {
    setMfaEnabled(true);
    setIsMfaModalOpen(false);
    // await updateSession();
    // Or simply update local state and trust backend consistency for next login
  };
  
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const navigateToModule = (ruta: string) => {
    router.push(ruta);
    setIsMenuOpen(false);
  };

  if (status === 'loading' || (status === 'authenticated' && !session?.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg text-crema">Cargando...</p>
      </div>
    );
  }

  if (!session?.user) { // Should be caught by status === 'unauthenticated' and redirected
    return null;
  }

  const nombre = session.user.persona?.nombre ?? '';
  const nombreCompleto = session.user.persona ? `${session.user.persona.nombre} ${session.user.persona.apellido}` : session.user.email || 'Usuario';
  const iniciales = session.user.persona
    ? `${session.user.persona.nombre?.[0] ?? ''}${session.user.persona.apellido?.[0] ?? ''}`
    : (session.user.email?.[0] ?? 'U').toUpperCase();
  const perfiles: string[] = (session.user.perfiles ?? []).map((p: any) => p?.nombre).filter(Boolean);
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoy = fecha.charAt(0).toUpperCase() + fecha.slice(1); // "Lunes, 19 de octubre"

  return (
    <div className="min-h-screen bg-background text-crema">
      {/* Barra superior */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <button type="button" onClick={() => router.push('/welcome')} className="flex items-center gap-3">
            <Image src="/assets/logopng.png" alt="" width={30} height={36} />
            <span className="titulo text-xl text-primary">MemoPsy</span>
          </button>

          <div className="relative flex items-center gap-3">
            <span className="hidden text-sm text-crema/70 sm:block">{nombreCompleto}</span>
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="flex h-10 items-center gap-2 rounded-full border border-white/15 pl-1 pr-3 transition-colors hover:border-primary/60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {iniciales}
              </span>
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {/* Menú desplegable */}
            {isMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/40">
                <div className="border-b border-white/10 p-4">
                  <p className="font-semibold">{nombreCompleto}</p>
                  <p className="text-sm text-crema/65">{session.user.email}</p>
                </div>
                <div className="p-2">
                  {modulosPermitidos.length > 0 ? (
                    modulosPermitidos.map((modulo) => {
                      const IconComponent = modulo.icon;
                      return (
                        <button
                          key={modulo.id}
                          type="button"
                          onClick={() => navigateToModule(modulo.ruta)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <IconComponent className="h-5 w-5 text-primary" />
                          {modulo.nombre}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2 text-sm text-crema/60">Todavía no tenés módulos asignados.</p>
                  )}
                </div>
                <div className="border-t border-white/10 p-2">
                  <button
                    type="button"
                    onClick={() => navigateToModule('/welcome')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <HomeIcon className="h-5 w-5 text-crema/70" />
                    Inicio
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Saludo */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card px-8 py-10 sm:px-12">
          <FondoAnimado />
          <div className="relative">
            <p className="entrar text-sm text-crema/60">{hoy}</p>
            <h1 className="titulo entrar mt-2 text-4xl sm:text-5xl" style={{ animationDelay: '0.1s' }}>
              Hola{nombre ? `, ${nombre}` : ''}
            </h1>
            <p className="entrar mt-3 text-lg text-crema/75" style={{ animationDelay: '0.2s' }}>
              ¿Qué querés hacer hoy?
            </p>
            {perfiles.length > 0 && (
              <div className="entrar mt-5 flex flex-wrap gap-2" style={{ animationDelay: '0.3s' }}>
                {perfiles.map((perfil) => (
                  <span key={perfil} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {perfil}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Módulos */}
          <section aria-label="Módulos">
            {modulosPermitidos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {modulosPermitidos.map((modulo, i) => {
                  const IconComponent = modulo.icon;
                  return (
                    <button
                      key={modulo.id}
                      type="button"
                      onClick={() => navigateToModule(modulo.ruta)}
                      className="entrar group flex flex-col rounded-3xl border border-white/10 bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-black/30 focus-visible:outline-2 focus-visible:outline-primary"
                      style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 transition-colors group-hover:bg-primary">
                        <IconComponent className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                      </span>
                      <span className="mt-5 text-xl font-semibold">{modulo.nombre}</span>
                      <span className="mt-1 flex-1 text-crema/65">{modulo.descripcion}</span>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        Entrar
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
                <h2 className="text-xl font-semibold">Todavía no tenés módulos asignados</h2>
                <p className="mt-2 text-crema/65">
                  Pedile al administrador del consultorio que te asigne un perfil para empezar a trabajar.
                </p>
              </div>
            )}
          </section>

          {/* Cuenta */}
          <aside className="entrar h-fit rounded-3xl border border-white/10 bg-card p-6" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {iniciales}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{nombreCompleto}</p>
                <p className="truncate text-sm text-crema/65">{session.user.email}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-crema/65">Estado</dt>
                <dd className={session.user.activo ? 'text-emerald-300' : 'text-red-300'}>
                  {session.user.activo ? 'Activo' : 'Inactivo'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-crema/65">Permisos</dt>
                <dd>{session.user.permisos?.length || 0}</dd>
              </div>
            </dl>

            {/* Verificación en dos pasos */}
            <div className={`mt-5 rounded-2xl p-4 ${mfaEnabled ? 'bg-emerald-400/10' : 'bg-primary/10'}`}>
              <div className="flex items-start gap-3">
                {loadingMfaStatus ? (
                  <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-crema/60" />
                ) : mfaEnabled ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-semibold">Verificación en dos pasos</p>
                  <p className="text-sm text-crema/70">
                    {loadingMfaStatus ? 'Consultando...' : mfaEnabled ? 'Activada: tu cuenta está protegida.' : 'Desactivada: te recomendamos activarla.'}
                  </p>
                </div>
              </div>
              {mfaError && <p className="mt-2 text-xs text-red-300">{mfaError}</p>}
              <Button
                onClick={handleToggleMfa}
                disabled={loadingMfaStatus || isTogglingMfa || mfaEnabled === null}
                className={`mt-4 w-full rounded-full ${mfaEnabled ? 'border border-primary/60 bg-transparent text-primary hover:bg-primary/10' : ''}`}
              >
                {isTogglingMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                {mfaEnabled ? 'Desactivar' : 'Activar ahora'}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* Ventanas de la verificación en dos pasos */}
      {session?.user && (
        <>
          <MfaSetupModal
            isOpen={isMfaModalOpen}
            onClose={() => {
              setIsMfaModalOpen(false);
              setMfaError(null);
            }}
            onSuccess={handleMfaSuccess}
          />
          <MfaDesactivarModal
            isOpen={isDesactivarOpen}
            onClose={() => setIsDesactivarOpen(false)}
            onSuccess={() => {
              setMfaEnabled(false);
              setIsDesactivarOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
