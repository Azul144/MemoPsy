// lib/auth/auth-config.ts
import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UsuarioService, 
    UsuarioTienePerfilService, 
    PerfilTienePermisoService, 
    PerfilService, 
    PermisoService } from '@/services/index';
import { UsuarioRepository, 
    PersonaRepository, 
    UsuarioTienePerfilRepository, 
    PerfilRepository, 
    PerfilTienePermisoRepository, 
    PermisoRepository,
    ModuloRepository,
    AccionRepository,
  PsicologoRepository,
PacienteRepository } from '@/repositories/index';
import { JWT } from 'next-auth/jwt';
import { initializeDatabase } from '@/lib/database';

declare module 'next-auth' {
  interface User {
    activo: boolean;
    persona: any;
    perfiles: any[];
    permisos: any[];
    pacienteId?: string | null;
    psicologoId?: string | null;
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 INICIO DE AUTENTICACIÓN');
        console.log('📧 Email recibido:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Credenciales faltantes');
          return null;
        }

        try {
          console.log('🔄 Inicializando base de datos...');
          const dataSource = await initializeDatabase();
          console.log('✅ Base de datos inicializada');
          
          // Inicializar repositorios
          const usuarioRepository = new UsuarioRepository(dataSource);
          const personaRepository = new PersonaRepository(dataSource);
          const usuarioTienePerfilRepository = new UsuarioTienePerfilRepository(dataSource);
          const perfilRepository = new PerfilRepository(dataSource);
          const perfilTienePermisoRepository = new PerfilTienePermisoRepository(dataSource);
          const permisoRepository = new PermisoRepository(dataSource);
          const moduloRepository = new ModuloRepository(dataSource);
          const accionRepository = new AccionRepository(dataSource);

          // Inicializar servicios
          const perfilService = new PerfilService(perfilRepository);
          const permisoService = new PermisoService(permisoRepository, moduloRepository, accionRepository);
          const usuarioService = new UsuarioService(usuarioRepository, personaRepository);
          const usuarioTienePerfilService = new UsuarioTienePerfilService(
            usuarioTienePerfilRepository,
            usuarioService,
            perfilService
          );
          const perfilTienePermisoService = new PerfilTienePermisoService(
            perfilTienePermisoRepository,
            perfilService,
            permisoService
          );

          console.log('🔍 Intentando login...');
          const loginResult = await usuarioService.loginUsuario({
            email: credentials.email,
            password: credentials.password
          });

          console.log('📊 Resultado login:', {
            usuarioEncontrado: !!loginResult.usuario,
            usuarioId: loginResult.usuario?.id,
            usuarioEmail: loginResult.usuario?.email,
            usuarioActivo: loginResult.usuario?.activo
          });

          if (!loginResult.usuario) {
            console.log('❌ Usuario no encontrado o credenciales inválidas');
            return null;
          }

          // AQUÍ ES DONDE PUEDE ESTAR EL PROBLEMA
          console.log('👤 Usuario encontrado, obteniendo perfiles...');
          console.log('🆔 Usuario ID:', loginResult.usuario.id);
          console.log('🔤 Tipo de Usuario ID:', typeof loginResult.usuario.id);

          // Primero, verificar si existen perfiles para este usuario
          //const perfilCount = await usuarioTienePerfilRepository.count({
          //  where: { usuarioId: loginResult.usuario.id }
          //});
          const perfilCount = usuarioTienePerfilRepository.countByUsuarioId(loginResult.usuario.id)
          console.log('📊 Cantidad de perfiles encontrados:', perfilCount);

          let perfiles: any[] = [];
          if (await perfilCount > 0) {
            try {
              console.log('🔄 Obteniendo perfiles...');
              perfiles = await usuarioTienePerfilService.obtenerPerfilesDeUsuario(
                loginResult.usuario.id
              );
              console.log('✅ Perfiles obtenidos:', perfiles.length);
              console.log('📋 Perfiles data:', JSON.stringify(perfiles, null, 2));
            } catch (error) {
              console.error('❌ Error al obtener perfiles:', error);
              console.error('📄 Stack trace:', error.stack);
              // NO retornar null aquí, continuar sin perfiles
            }
          } else {
            console.log('ℹ️ Usuario sin perfiles asignados');
          }

          // Obtener permisos
          const permisos = [];
          if (perfiles.length > 0) {
            try {
              console.log('🔄 Obteniendo permisos...');
              for (const perfilRelacion of perfiles) {
                console.log('🔍 Procesando perfil ID:', perfilRelacion.perfilId);
                const permisosDelPerfil = await perfilTienePermisoService.obtenerPermisosDePerfil(
                  perfilRelacion.perfilId
                );
                console.log('📊 Permisos del perfil:', permisosDelPerfil.length);
                permisos.push(...permisosDelPerfil.map(p => p.permiso));
              }
            } catch (error) {
              console.error('❌ Error al obtener permisos:', error);
              console.error('📄 Stack trace:', error.stack);
              // NO retornar null aquí, continuar sin permisos
            }
          }

          // Eliminar permisos duplicados
          const permisosUnicos = permisos.filter((permiso, index, self) => 
            index === self.findIndex(p => p.id === permiso.id)
          );

          console.log('📊 Resumen final:');
          console.log('- Perfiles:', perfiles.length);
          console.log('- Permisos únicos:', permisosUnicos.length);
          const pacienteRepository = new PacienteRepository(dataSource);
          const psicologoRepository = new PsicologoRepository(dataSource);

          const personaId = loginResult.usuario.persona?.id;

          let pacienteId: string | null = null;
          let psicologoId: string | null = null;

          if (personaId) {
            const paciente = await pacienteRepository.findByPersonaId(personaId);
            if (paciente) pacienteId = paciente.id;

            const psicologo = await psicologoRepository.findByPersonaId(personaId);
            if (psicologo) psicologoId = psicologo.id;
          }


          const userResult = {
            id: loginResult.usuario.id,
            email: loginResult.usuario.email,
            activo: loginResult.usuario.activo,
            persona: loginResult.usuario.persona,
            perfiles: perfiles.map(p => p.perfil || p),
            permisos: permisosUnicos,
            pacienteId,
            psicologoId
          };

          console.log('✅ Usuario autenticado exitosamente');
          console.log('👤 User result:', JSON.stringify(userResult, null, 2));
          
          return userResult;

        } catch (error) {
          console.error('💥 ERROR CRÍTICO durante la autenticación:', error);
          console.error('📄 Stack trace completo:', error.stack);
          console.error('🔍 Error name:', error.name);
          console.error('💬 Error message:', error.message);
          
          // En lugar de retornar null, intentar un login básico sin perfiles
          try {
            console.log('🔄 Intentando login básico sin perfiles...');
            const dataSource = await initializeDatabase();
            const usuarioRepository = new UsuarioRepository(dataSource);
            const personaRepository = new PersonaRepository(dataSource);
            const usuarioService = new UsuarioService(usuarioRepository, personaRepository);
            
            const loginResult = await usuarioService.loginUsuario({
              email: credentials.email,
              password: credentials.password
            });

            if (loginResult.usuario) {
              console.log('✅ Login básico exitoso');
              return {
                id: loginResult.usuario.id,
                email: loginResult.usuario.email,
                activo: loginResult.usuario.activo,
                persona: loginResult.usuario.persona,
                perfiles: [],
                permisos: []
              };
            }
          } catch (basicError) {
            console.error('💥 Error en login básico también:', basicError);
          }
          
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 horas
  },
  jwt: {
    maxAge: 2 * 60 * 60, // 2 horas
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('🔐 JWT Callback ejecutado');
      if (user) {
        console.log('👤 Usuario en JWT:', user.email);
        token.id = user.id;
        token.email = user.email;
        token.activo = user.activo;
        token.persona = user.persona;
        token.perfiles = user.perfiles;
        token.permisos = user.permisos;
        token.pacienteId = user.pacienteId;
        token.psicologoId = user.psicologoId;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('📋 Session Callback ejecutado');
      if (token) {
        console.log('🔑 Token en session:', token.email);
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.activo = token.activo as boolean;
        session.user.persona = token.persona;
        session.user.perfiles = token.perfiles as any[];
        session.user.permisos = token.permisos as any[];
        session.user.pacienteId = token.pacienteId;
        session.user.psicologoId = token.psicologoId;

      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Habilitar debug de NextAuth
};

/*
import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UsuarioService, 
    UsuarioTienePerfilService, 
    PerfilTienePermisoService, 
    PerfilService, 
    PermisoService } from '@/services/index';
import { UsuarioRepository, 
    PersonaRepository, 
    UsuarioTienePerfilRepository, 
    PerfilRepository, 
    PerfilTienePermisoRepository, 
    PermisoRepository,
    ModuloRepository,
    AccionRepository } from '@/repositories/index';
import { JWT } from 'next-auth/jwt';
// Inicializar servicios (esto debería venir de tu contenedor de dependencias)
import { AppDataSource } from '@/lib/database';

const usuarioRepository = new UsuarioRepository(AppDataSource);
const personaRepository = new PersonaRepository(AppDataSource);
const usuarioTienePerfilRepository = new UsuarioTienePerfilRepository(AppDataSource);
const perfilRepository = new PerfilRepository(AppDataSource);
const perfilTienePermisoRepository = new PerfilTienePermisoRepository(AppDataSource);
const permisoRepository = new PermisoRepository(AppDataSource);
const moduloRepository = new ModuloRepository(AppDataSource);
const accionRepository = new AccionRepository(AppDataSource);

const perfilService = new PerfilService(perfilRepository);
const permisoService = new PermisoService(permisoRepository, moduloRepository, accionRepository);
const usuarioService = new UsuarioService(usuarioRepository, personaRepository);
const usuarioTienePerfilService = new UsuarioTienePerfilService(
  usuarioTienePerfilRepository,
  usuarioService,
  perfilService
);
const perfilTienePermisoService = new PerfilTienePermisoService(
  perfilTienePermisoRepository,
  perfilService,
  permisoService
);

declare module 'next-auth' {
  interface User {
    activo: boolean;
    persona: any;
    perfiles: any[];
    permisos: any[];
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {

          const loginResult = await usuarioService.loginUsuario({
            email: credentials.email,
            password: credentials.password
          });

          if (!loginResult.usuario) {
            return null;
          }

          // Obtener perfiles del usuario con manejo de errores
          let perfiles: any[] = [];
          try {
            perfiles = await usuarioTienePerfilService.obtenerPerfilesDeUsuario(
              loginResult.usuario.id
            );
            console.log('Perfiles obtenidos:', perfiles.length);
            console.log('Perfiles data:', perfiles); // Para debugging
          } catch (error) {
            console.error('Error al obtener perfiles:', error);
            console.error('Stack trace:', error.stack); // Más detalle del error
            // Continuar sin perfiles si hay error
          }

          // Obtener permisos de todos los perfiles con manejo de errores
          const permisos = [];
          try {
            for (const perfilRelacion of perfiles) {
              const permisosDelPerfil = await perfilTienePermisoService.obtenerPermisosDePerfil(
                perfilRelacion.perfilId
              );
              permisos.push(...permisosDelPerfil.map(p => p.permiso));
            }
          } catch (error) {
            console.error('Error al obtener permisos:', error);
            // Continuar sin permisos si hay error
          }

          // Eliminar permisos duplicados
          const permisosUnicos = permisos.filter((permiso, index, self) => 
            index === self.findIndex(p => p.id === permiso.id)
          );

          return {
            id: loginResult.usuario.id,
            email: loginResult.usuario.email,
            activo: loginResult.usuario.activo,
            persona: loginResult.usuario.persona,
            perfiles: perfiles.map(p => p.perfil),
            permisos: permisosUnicos
          };
        } catch (error) {
          console.error('Error durante la autenticación:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 horas
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.activo = user.activo;
        token.persona = user.persona;
        token.perfiles = user.perfiles;
        token.permisos = user.permisos;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.activo = token.activo as boolean;
        session.user.persona = token.persona;
        session.user.perfiles = token.perfiles as any[];
        session.user.permisos = token.permisos as any[];
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET
};
*/