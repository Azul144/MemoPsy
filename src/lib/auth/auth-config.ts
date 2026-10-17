// src/lib/auth/auth-config.ts
import { NextAuthOptions, User as NextAuthUser } from 'next-auth'; // Renamed User to NextAuthUser to avoid conflict
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
    PacienteRepository } from '@/repositories/index'; // Assuming these paths are correct from lib
// import { JWT } from 'next-auth/jwt'; // JWT type is available globally via next-auth/jwt
import { initializeDatabase } from '@/lib/database'; // Assuming this path is correct

// Helper function to get Auth0 Management API Token
// Included directly here to simplify subtask. Can be refactored later.
async function getAuth0ManagementToken() {
  const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", "");
  if (!auth0Domain) {
    console.error("AUTH0_ISSUER_BASE_URL is not set in environment variables.");
    throw new Error("AUTH0_ISSUER_BASE_URL is not set in environment variables.");
  }
  if (!process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET) {
    console.error("AUTH0_CLIENT_ID or AUTH0_CLIENT_SECRET are not set.");
    throw new Error("AUTH0_CLIENT_ID or AUTH0_CLIENT_SECRET are not set in environment variables.");
  }

  const response = await fetch(`https://${auth0Domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: `https://${auth0Domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Error obtaining Auth0 Management API token:", errorBody);
    throw new Error(`Error obtaining Auth0 Management API token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}


declare module 'next-auth' {
  interface User { // This User type is extended by NextAuth
    id: string; // Ensure id is always string
    email?: string | null;
    activo: boolean;
    persona: any; // Consider defining a more specific type for persona
    perfiles: any[]; // Same for perfiles
    permisos: any[]; // Same for permisos
    auth0Id?: string | null; // Added auth0Id
    pacienteId?: string | null;
    psicologoId?: string | null;
  }
  interface Session {
    user: User & { // Ensure session user also has these properties
        id: string; // next-auth default is string for id in session.user if not customized further in jwt/session
        auth0Id?: string | null;
        // other custom props if needed
    };
  }
}

// Define custom properties for credentials if they are not strings
interface CustomCredentials extends Record<string, unknown> {
  email?: string;
  password?: string;
  mfaCode?: string;
  skipMfa?: string; // Received as string from form, convert to boolean
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
        // skipMfa is sent as a string 'true'/'false' from client, handle conversion
        skipMfa: { label: 'Skip MFA', type: 'text' } 
      },
      async authorize(credentialsUntyped): Promise<NextAuthUser | null> { // Ensure return type is NextAuthUser | null
        const credentials = credentialsUntyped as CustomCredentials; // Cast to handle non-string types if necessary

        console.log('🔐 INICIO DE AUTENTICACIÓN');
        console.log('📧 Email recibido:', credentials?.email);
        console.log('🔑 MFA Code recibido:', credentials?.mfaCode);
        console.log('⏭️ Skip MFA recibido:', credentials?.skipMfa);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Credenciales primarias faltantes');
          throw new Error('EMAIL_OR_PASSWORD_MISSING');
        }

        let dataSource;
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
          
          console.log('🔍 Intentando login (credenciales primarias)...');
          const loginResult = await usuarioService.loginUsuario({
            email: credentials.email,
            password: credentials.password
          });

          if (!loginResult.usuario) {
            console.log('❌ Usuario no encontrado o credenciales primarias inválidas');
            throw new Error('INVALID_PRIMARY_CREDENTIALS');
          }
          console.log('✅ Credenciales primarias válidas para usuario:', loginResult.usuario.id);
          console.log('🆔 Usuario DB auth0Id:', loginResult.usuario.auth0Id);


          // MFA Logic
          const skipMfaCheck = credentials.skipMfa === 'true';
          if (loginResult.usuario.auth0Id) { // User has an Auth0 ID, MFA might be enabled
            console.log('🛡️ Usuario tiene auth0Id, verificando estado de MFA en Auth0...');
            const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", "");
            if (!auth0Domain) throw new Error("AUTH0_ISSUER_BASE_URL_NOT_SET");
            const auth0Token = await getAuth0ManagementToken();

            const mfaCheckResponse = await fetch(`https://${auth0Domain}/api/v2/users/${loginResult.usuario.auth0Id}/multifactor`, {
              headers: { Authorization: `Bearer ${auth0Token}` },
            });

            let isAuth0MfaEnabled = false;
            if (mfaCheckResponse.ok) {
              const mfaData = await mfaCheckResponse.json();
              isAuth0MfaEnabled = mfaData.length > 0;
              console.log('💡 Estado de MFA en Auth0:', isAuth0MfaEnabled ? 'Activado' : 'Desactivado');
            } else if (mfaCheckResponse.status === 404) {
              console.log('💡 MFA no configurado en Auth0 para el usuario (404).');
              isAuth0MfaEnabled = false;
            } else {
              console.error('⚠️ Error al verificar MFA en Auth0:', await mfaCheckResponse.text());
              // Fail open (treat as MFA not enabled) or fail closed (throw error)?
              // For security, if check fails, might be safer to deny login or assume MFA is active.
              // However, if API is temporarily down, this could lock users out.
              // Let's throw an error indicating check failure.
              throw new Error('MFA_CHECK_FAILED');
            }

            if (isAuth0MfaEnabled) {
              if (skipMfaCheck) {
                console.log('⏭️ Saltando verificación de MFA (pre-autenticación)');
              } else if (!credentials.mfaCode) {
                console.log('❌ Código MFA requerido pero no proporcionado.');
                throw new Error('MFA_REQUIRED');
              } else {
                console.log('🔐 Verificando código MFA con Auth0...');
                
                const guardianVerifyResponse = await fetch(`https://${auth0Domain}/api/v2/guardian/factors/authenticator/verify`, {
                     method: "POST",
                     headers: {
                         "Content-Type": "application/json",
                         Authorization: `Bearer ${auth0Token}`,
                     },
                     // Corrected body structure as per issue context: user_id is part of the body for this specific legacy endpoint.
                     body: JSON.stringify({ code: credentials.mfaCode, user_id: loginResult.usuario.auth0Id }),
                });

                if (!guardianVerifyResponse.ok) {
                  const errorBodyText = await guardianVerifyResponse.text();
                  let errorDetail = 'Respuesta no OK';
                  try {
                    const errorBodyJson = JSON.parse(errorBodyText);
                    errorDetail = errorBodyJson.message || errorBodyText;
                  } catch (e) {
                    errorDetail = errorBodyText;
                  }
                  console.log('❌ Código MFA inválido:', errorDetail);
                  throw new Error('INVALID_MFA_CODE');
                }
                console.log('✅ Código MFA verificado exitosamente.');
              }
            }
          }
          // End of MFA Logic

          // Prepare user object for session
          console.log('👤 Usuario autenticado, obteniendo perfiles y permisos...');
          console.log('🆔 Usuario ID:', loginResult.usuario.id);
          console.log('🔤 Tipo de Usuario ID:', typeof loginResult.usuario.id);

          // Primero, verificar si existen perfiles para este usuario
          //const perfilCount = await usuarioTienePerfilRepository.count({
          const perfilCountResult = await usuarioTienePerfilRepository.countByUsuarioId(loginResult.usuario.id);
          const perfilCount = typeof perfilCountResult === 'number' ? perfilCountResult : (await perfilCountResult).count;

          let perfiles: any[] = [];
          if (perfilCount > 0) {
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
            psicologoId,
          };
          
          console.log('✅ Usuario completamente autenticado y listo para sesión:', userResult.email);
          return userResult;

        } catch (error: any) {
          console.error('💥 ERROR DURANTE LA AUTENTICACIÓN:', error.message);
          if (error.message === 'EMAIL_OR_PASSWORD_MISSING' || 
              error.message === 'INVALID_PRIMARY_CREDENTIALS' ||
              error.message === 'MFA_REQUIRED' ||
              error.message === 'INVALID_MFA_CODE' ||
              error.message === 'MFA_CHECK_FAILED' ||
              error.message === 'AUTH0_ISSUER_BASE_URL_NOT_SET' ||
              error.message.startsWith('Error obtaining Auth0 Management API token')) { // Catch token error
            throw error; // Re-throw known errors
          }
          console.error('📄 Stack trace completo:', error.stack);
          throw new Error('GENERIC_AUTH_ERROR'); // Generic error for unknown issues
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
    async encode({ secret, token }) {
        // console.log("JWT encode token:", token);
        const { SignJWT } = await import('jose'); // Correct import for SignJWT
        const secretKey = new TextEncoder().encode(secret);
        return await new SignJWT(token!) // token can be undefined
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('2h') // Match maxAge
            .sign(secretKey);
    },
    async decode({ secret, token }) {
        // console.log("JWT decode token:", token);
        if (!token) return null;
        const { jwtVerify } = await import('jose');
        const secretKey = new TextEncoder().encode(secret);
        try {
            const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
            return payload;
        } catch (error) {
            console.error("JWT decode error:", error);
            return null;
        }
    }
  },
  callbacks: {
    async jwt({ token, user, account, profile }) { // Added account, profile for completeness
      // console.log('🔐 JWT Callback: user:', user, 'token:', token, 'account:', account);
      if (user) { // User object is available on initial sign in
        token.id = user.id; // user.id should be string
        token.email = user.email;
        token.activo = user.activo;
        token.persona = user.persona;
        token.perfiles = user.perfiles;
        token.permisos = user.permisos;
        token.auth0Id = user.auth0Id; // Pass auth0Id to token
        token.pacienteId = user.pacienteId;
        token.psicologoId = user.psicologoId;
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('📋 Session Callback: token:', token, 'session:', session);
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string | null | undefined;
        session.user.activo = token.activo as boolean;
        session.user.persona = token.persona; 
        session.user.perfiles = token.perfiles as any[]; 
        session.user.permisos = token.permisos as any[]; 
        session.user.auth0Id = token.auth0Id as string | null | undefined; 
        session.user.pacienteId = token.pacienteId as string | null | undefined;
        session.user.psicologoId = token.psicologoId as string | null | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Corrected to match actual login page path
    error: '/auth/error' 
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

/*
import { NextAuthOptions, User as NextAuthUser } from 'next-auth'; // Renamed User to NextAuthUser to avoid conflict
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