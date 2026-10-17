// src/app/api/auth/check-mfa/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/database"; // Assuming this path is correct
import { UsuarioRepository } from "@/repositories/index"; // Assuming this path is correct
import { getAuth0ManagementToken } from "../mfa/route"; // Importing from the other MFA route

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Initialize database
    const dataSource = await initializeDatabase();
    const usuarioRepository = new UsuarioRepository(dataSource);

    // Find user by email
    const usuario = await usuarioRepository.findByEmail(email);
    if (!usuario) {
      // If user not found, MFA is not relevant, but for security, don't reveal user existence.
      // Depending on desired behavior, you might return mfaRequired: false or an error.
      // For now, let's assume if no user, no MFA.
      return NextResponse.json({ mfaRequired: false });
    }

    // If the user does not have an auth0Id, they cannot have MFA configured through Auth0.
    if (!usuario.auth0Id) {
      return NextResponse.json({ mfaRequired: false });
    }

    // Check if the user has MFA configured in Auth0
    const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", "");
    if (!auth0Domain) {
      console.error("AUTH0_ISSUER_BASE_URL is not set");
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
    }
    const auth0Token = await getAuth0ManagementToken();

    const response = await fetch(`https://${auth0Domain}/api/v2/users/${usuario.auth0Id}/multifactor`, {
      headers: {
        Authorization: `Bearer ${auth0Token}`,
      },
    });

    if (!response.ok) {
      // If the error is 404, it means the user doesn't have MFA factors, which is not an error in this context.
      if (response.status === 404) {
        return NextResponse.json({ mfaRequired: false });
      }
      console.error("Error al verificar MFA en Auth0:", await response.text());
      // It's safer to assume MFA is not required if there's an unexpected error checking.
      return NextResponse.json({ mfaRequired: false }); 
    }

    const mfaData = await response.json();
    // mfaData will be an array. If it's not empty, user has MFA enrolled.
    const mfaRequired = mfaData.length > 0;

    return NextResponse.json({ mfaRequired });
  } catch (error) {
    console.error("Error en /api/auth/check-mfa:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
