// src/types/next-auth.d.ts
// Amplía los tipos de NextAuth para que la sesión y el token incluyan la persona, los perfiles y los permisos.
import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name?: string
    perfilId?: string
    tipo?: string
  }

  interface Session {
    user: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    perfilId?: string
    tipo?: string
  }
}

