// src/lib/auth/auth-config.ts
import { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import {
  UsuarioService,
  UsuarioTienePerfilService,
  PerfilTienePermisoService,
  PerfilService,
  PermisoService,
} from "@/services/index";
import {
  UsuarioRepository,
  PersonaRepository,
  UsuarioTienePerfilRepository,
  PerfilRepository,
  PerfilTienePermisoRepository,
  PermisoRepository,
  ModuloRepository,
  AccionRepository,
  PsicologoRepository,
  PacienteRepository,
} from "@/repositories/index";
import { initializeDatabase } from "@/lib/database";
import { verificarLogin } from "./login";

declare module "next-auth" {
  interface User {
    id: string;
    activo: boolean;
    persona: any;
    perfiles: any[];
    permisos: any[];
    auth0Id?: string | null;
    pacienteId?: string | null;
    psicologoId?: string | null;
  }
  interface Session {
    user: User & { id: string };
  }
}

// Errores que se le pueden mostrar al usuario (la pantalla de login los traduce)
const ERRORES_CONOCIDOS = [
  "CREDENCIALES_INVALIDAS",
  "CUENTA_BLOQUEADA",
  "CUENTA_INACTIVA",
  "MFA_REQUERIDO",
  "CODIGO_INVALIDO",
];

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        codigo: { label: "Código de verificación", type: "text" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("CREDENCIALES_INVALIDAS");
        }

        const dataSource = await initializeDatabase();

        // 1. Contraseña + código (si tiene MFA). Si algo falla, se corta acá
        //    y NO se crea la sesión.
        let usuario;
        try {
          usuario = await verificarLogin(
            dataSource,
            credentials.email,
            credentials.password,
            credentials.codigo || undefined
          );
        } catch (error) {
          if (error instanceof Error && ERRORES_CONOCIDOS.includes(error.message)) {
            throw error;
          }
          console.error("Error inesperado durante el login"); // sin datos personales
          throw new Error("ERROR_INTERNO");
        }

        // 2. Perfiles y permisos del usuario (para el control de acceso por rol)
        const personaRepository = new PersonaRepository(dataSource);
        const usuarioService = new UsuarioService(new UsuarioRepository(dataSource), personaRepository);
        const perfilService = new PerfilService(new PerfilRepository(dataSource));
        const permisoService = new PermisoService(
          new PermisoRepository(dataSource),
          new ModuloRepository(dataSource),
          new AccionRepository(dataSource)
        );
        const usuarioTienePerfilService = new UsuarioTienePerfilService(
          new UsuarioTienePerfilRepository(dataSource),
          usuarioService,
          perfilService
        );
        const perfilTienePermisoService = new PerfilTienePermisoService(
          new PerfilTienePermisoRepository(dataSource),
          perfilService,
          permisoService
        );

        let perfiles: any[] = [];
        try {
          perfiles = await usuarioTienePerfilService.obtenerPerfilesDeUsuario(usuario.id);
        } catch {
          perfiles = []; // usuario sin perfiles asignados
        }

        const permisos: any[] = [];
        for (const relacion of perfiles) {
          const permisosDelPerfil = await perfilTienePermisoService.obtenerPermisosDePerfil(
            relacion.perfilId
          );
          permisos.push(...permisosDelPerfil.map((p: any) => p.permiso));
        }
        const permisosUnicos = permisos.filter(
          (permiso, i, lista) => i === lista.findIndex((p) => p.id === permiso.id)
        );

        // 3. ¿Es paciente o psicólogo?
        let pacienteId: string | null = null;
        let psicologoId: string | null = null;
        if (usuario.persona?.id) {
          const paciente = await new PacienteRepository(dataSource).findByPersonaId(usuario.persona.id);
          if (paciente) pacienteId = paciente.id;
          const psicologo = await new PsicologoRepository(dataSource).findByPersonaId(usuario.persona.id);
          if (psicologo) psicologoId = psicologo.id;
        }

        return {
          id: String(usuario.id),
          email: usuario.email,
          activo: usuario.activo,
          persona: usuario.persona,
          perfiles: perfiles.map((p) => p.perfil || p),
          permisos: permisosUnicos,
          pacienteId,
          psicologoId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 horas
  },
  jwt: {
    maxAge: 2 * 60 * 60, // 2 horas
    async encode({ secret, token }) {
      const { SignJWT } = await import("jose");
      const secretKey = new TextEncoder().encode(secret as string);
      return await new SignJWT(token!)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(secretKey);
    },
    async decode({ secret, token }) {
      if (!token) return null;
      const { jwtVerify } = await import("jose");
      const secretKey = new TextEncoder().encode(secret as string);
      try {
        const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
        return payload as JWT;
      } catch {
        return null;
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email as string;
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
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.activo = token.activo as boolean;
        session.user.persona = token.persona;
        session.user.perfiles = token.perfiles as any[];
        session.user.permisos = token.permisos as any[];
        session.user.pacienteId = token.pacienteId as string | null | undefined;
        session.user.psicologoId = token.psicologoId as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};