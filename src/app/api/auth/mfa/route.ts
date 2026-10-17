// src/app/api/auth/mfa/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { UsuarioEntity } from "@/entities/index"; 
import crypto from 'crypto';

// Updated helper function to generate a stronger random password
function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{};:,./?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill the rest of the password length
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password to make character positions random
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// ... (getAuth0ManagementToken function remains the same) ...
export async function getAuth0ManagementToken() {
  const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", "");
  if (!auth0Domain) {
    throw new Error("AUTH0_ISSUER_BASE_URL is not set in environment variables.");
  }
  if (!process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET) {
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { action, code } = await req.json();

    const dataSource = await initializeDatabase();
    const usuarioRepository = dataSource.getRepository(UsuarioEntity); 
    
    let usuario = await usuarioRepository.findOne({ where: { id: session.user.id }, relations: ["persona"] });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    
    const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", "");
    if (!auth0Domain) {
      console.error("AUTH0_ISSUER_BASE_URL is not set");
      return NextResponse.json({ error: "Error de configuración del servidor (Auth0 Domain)" }, { status: 500 });
    }
    
    // Management API Token (used for user lookup/create)
    const managementApiToken = await getAuth0ManagementToken();

    if (action === "enable") {
      let currentAuth0Id = usuario.auth0Id;

      if (!currentAuth0Id) {
        // ... (logic for finding/creating user in Auth0 and saving auth0Id locally remains IDENTICAL to previous version) ...
        console.log(`Usuario ${usuario.email} no tiene auth0Id. Buscando/creando en Auth0 via Management API.`);
        const usersByEmailResponse = await fetch(`https://${auth0Domain}/api/v2/users-by-email?email=${encodeURIComponent(usuario.email)}`, {
          headers: { Authorization: `Bearer ${managementApiToken}` },
        });
        if (!usersByEmailResponse.ok) { 
            console.error("Error buscando usuario por email en Auth0 (Management API):", await usersByEmailResponse.text());
            return NextResponse.json({ error: "Error al verificar usuario en Auth0" }, { status: 500 });
        }
        const usersFound = await usersByEmailResponse.json();
        if (usersFound && usersFound.length > 0) {
          currentAuth0Id = usersFound[0].user_id;
          console.log(`Usuario encontrado en Auth0 con ID: ${currentAuth0Id}`);
        } else {
          console.log(`Usuario ${usuario.email} no encontrado en Auth0. Creando nuevo usuario en Auth0 (Management API)...`);
          const randomPassword = generateRandomPassword();
          console.log(`Contraseña aleatoria generada para Auth0 (longitud ${randomPassword.length}): ${randomPassword}`);
          const createUserBody: any = {
            connection: "Username-Password-Authentication", 
            email: usuario.email, password: randomPassword, email_verified: true, 
          };
          if (usuario.persona?.nombre) createUserBody.given_name = usuario.persona.nombre;
          if (usuario.persona?.apellido) createUserBody.family_name = usuario.persona.apellido;
          if (usuario.persona?.nombre && usuario.persona?.apellido) createUserBody.name = `${usuario.persona.nombre} ${usuario.persona.apellido}`;
          const createUserResponse = await fetch(`https://${auth0Domain}/api/v2/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${managementApiToken}`},
            body: JSON.stringify(createUserBody),
          });
          if (!createUserResponse.ok) { 
            const errorText = await createUserResponse.text(); console.error("Error creando usuario en Auth0 (Management API):", errorText);
            try { const errorJson = JSON.parse(errorText); /* ... specific error checks ... */ 
                if (errorJson.message && errorJson.message.includes("PasswordStrengthError")) return NextResponse.json({ error: `Error de fortaleza de contraseña de Auth0: ${errorJson.message}` }, { status: 400 });
                if (errorJson.message && errorJson.message.includes("The user already exists")) return NextResponse.json({ error: "El usuario ya existe en Auth0 pero no pudo ser enlazado. Contacte soporte." }, { status: 409 });
                return NextResponse.json({ error: errorJson.message || "Error al crear usuario en Auth0 para 2FA" }, { status: createUserResponse.status });
            } catch(e) { return NextResponse.json({ error: "Error al crear usuario en Auth0 para 2FA" }, { status: createUserResponse.status }); }
          }
          const newAuth0User = await createUserResponse.json(); currentAuth0Id = newAuth0User.user_id;
          console.log(`Usuario creado en Auth0 con ID: ${currentAuth0Id}`);
        }
        if (currentAuth0Id) {
          usuario.auth0Id = currentAuth0Id;
          try { await usuarioRepository.save(usuario); console.log(`auth0Id ${currentAuth0Id} guardado para usuario local ${usuario.id}`); }
          catch (dbError) { console.error("Error guardando auth0Id en DB local:", dbError); return NextResponse.json({ error: "Error al actualizar datos locales del usuario para 2FA" }, { status: 500 }); }
        } else { console.error("No se pudo obtener/crear auth0Id."); return NextResponse.json({ error: "No se pudo configurar identidad para 2FA" }, { status: 500 }); }
      }
      
      if (!currentAuth0Id) { 
          return NextResponse.json({ error: "ID de usuario Auth0 no disponible. No se puede activar 2FA." }, { status: 400 });
      }

      // ***** USER'S PROPOSED MFA ENROLLMENT LOGIC using Authentication API /mfa/associate *****
      console.log(`Intentando inscribir MFA para Auth0 user ${currentAuth0Id} usando Authentication API /mfa/associate`);

      // 1. Get an access token for the /mfa/ audience
      const authApiTokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.AUTH0_CLIENT_ID, // M2M client_id
          client_secret: process.env.AUTH0_CLIENT_SECRET, // M2M client_secret
          audience: `https://${auth0Domain}/mfa/`, // Specific audience for MFA
          grant_type: "client_credentials",
          // The user's snippet included a scope here. Let's add it.
          // It's unclear if 'enroll read:authenticators remove:authenticators' are valid for CC grant for /mfa/ audience.
          // Standard scopes for CC are usually permissions defined for an API, not user-level OIDC scopes.
          // For now, including as per user's suggestion to test.
          scope: "enroll read:authenticators remove:authenticators" 
        }),
      });

      if (!authApiTokenResponse.ok) {
        const errorText = await authApiTokenResponse.text();
        console.error("Error obteniendo token para Authentication API (/mfa/ audience):", errorText);
        return NextResponse.json({ error: "Error de configuración interna para MFA (token /mfa/)" }, { status: 500 });
      }
      const authApiTokenData = await authApiTokenResponse.json();
      const authApiToken = authApiTokenData.access_token;

      if (!authApiToken) {
        console.error("No se recibió access_token para Authentication API (/mfa/ audience)");
        return NextResponse.json({ error: "Error de configuración interna para MFA (sin token /mfa/)" }, { status: 500 });
      }
      
      // 2. Call /mfa/associate
      // CRITICAL UNCERTAINTY: How does /mfa/associate know to act on `currentAuth0Id` when called with a CC token?
      // The standard /mfa/associate takes an `access_token` that represents the *user* (from login flow)
      // or an `mfa_token` (from a challenge). This part is highly experimental.
      const enrollAssociateResponse = await fetch(`https://${auth0Domain}/mfa/associate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authApiToken}`, // Token for /mfa/ audience
        },
        // Body as per user's suggestion.
        // This call does NOT include currentAuth0Id. This is the main concern.
        body: JSON.stringify({ 
          authenticator_types: ["otp"],
          // oob_channels: [], // Not needed if authenticator_types includes 'otp'
          // phone_number: null // Not needed for 'otp'
        }),
      });

      if (!enrollAssociateResponse.ok) {
        const errorText = await enrollAssociateResponse.text(); 
        console.error("Auth0 MFA enable (/mfa/associate) raw error response text:", errorText); 
        let errorJson: any = {};
        try { errorJson = JSON.parse(errorText); console.error("Auth0 MFA enable (/mfa/associate) parsed error JSON:", errorJson);  } 
        catch(e) { console.error("Failed to parse Auth0 error from /mfa/associate as JSON."); errorJson.message = errorText; }
        
        let clientErrorMessage = "Error al iniciar la activación de MFA en Auth0 via /mfa/associate.";
        if (errorJson.error_description) { // /mfa/associate often uses error/error_description
            clientErrorMessage = `Error de Auth0: ${errorJson.error_description}`;
        } else if (errorJson.message) {
            clientErrorMessage = `Error de Auth0: ${errorJson.message}`;
        } else if (errorText) {
            clientErrorMessage = `Error de Auth0: ${errorText.substring(0,150)}...`;
        }
        return NextResponse.json({ error: clientErrorMessage }, { status: enrollAssociateResponse.status });
      }
      
      const enrollmentData = await enrollAssociateResponse.json();
      console.log("Respuesta de /mfa/associate:", enrollmentData); 

      // Response from /mfa/associate for OTP typically includes:
      // barcode_uri, secret, oob_code (for some 'oob' authenticator_types, not usually for direct 'otp')
      // It might also include authenticator_id
      if (!enrollmentData.barcode_uri || !enrollmentData.secret) {
        console.error("Respuesta de /mfa/associate no contiene barcode_uri o secret:", enrollmentData);
        // If oob_code is present, it means a different flow is initiated.
        if (enrollmentData.oob_code) {
            console.log("Received oob_code from /mfa/associate. This flow is not fully handled yet for QR display.");
             return NextResponse.json({ error: "Configuración de MFA iniciada (OOB), pero la visualización directa de QR no está implementada para este flujo." }, { status: 501 }); // Not Implemented
        }
        return NextResponse.json({ error: "No se pudo obtener el código QR para la configuración de MFA desde Auth0 (/mfa/associate)." }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        qrCode: enrollmentData.barcode_uri,
        secret: enrollmentData.secret, // Secret is usually part of barcode_uri, but if API provides it separately, use it.
      });

    } else if (action === "status") {
      // ... (status logic remains the same) ...
      if (!usuario.auth0Id) { return NextResponse.json({ success: true, mfaEnabled: false });}
      const response = await fetch(`https://${auth0Domain}/api/v2/users/${usuario.auth0Id}/multifactor`, { headers: { Authorization: `Bearer ${managementApiToken}` }}); // Corrected to use managementApiToken
      if (!response.ok) { if (response.status === 404) { return NextResponse.json({ success: true, mfaEnabled: false });} const error = await response.json(); console.error("Auth0 MFA status error:", error); return NextResponse.json({ error: error.message || "Error al verificar estado de MFA" }, { status: response.status });}
      const mfaData = await response.json(); return NextResponse.json({ success: true, mfaEnabled: mfaData.length > 0 });

    } else if (action === "verify") {
      // ... (verify logic remains the same) ...
      if (!usuario.auth0Id) { return NextResponse.json({ error: "Usuario no tiene auth0Id para verificar MFA" }, { status: 400 });}
      if (!code) { return NextResponse.json({ error: "Código OTP requerido" }, { status: 400 });}
      console.warn("Action 'verify' in /api/auth/mfa is simplified. Primary OTP validation occurs at login."); return NextResponse.json({ success: true, message: "Setup acknowledged. Verification occurs at login." });

    } else if (action === "disable") {
      // ... (disable logic remains the same, using Management API token and /authenticators endpoint) ...
      if (!usuario.auth0Id) { return NextResponse.json({ error: "Usuario no tiene auth0Id para desactivar MFA" }, { status: 400 });}
      const authenticatorsRes = await fetch(`https://${auth0Domain}/api/v2/users/${usuario.auth0Id}/authenticators`, { headers: { Authorization: `Bearer ${managementApiToken}` }}); // Corrected to use managementApiToken
      if (!authenticatorsRes.ok) { const errorText = await authenticatorsRes.text(); console.error("Auth0 MFA disable (get authenticators) error:", errorText); if (authenticatorsRes.status === 404) return NextResponse.json({ success: true, message: "MFA (OTP) ya no estaba activado o no se encontraron autenticadores." }); let errorMessage = "Error al obtener configuraciones de MFA"; try { const errorJson = JSON.parse(errorText); errorMessage = errorJson.message || errorMessage;} catch(e) {} return NextResponse.json({ error: errorMessage }, { status: authenticatorsRes.status });}
      const authenticators: any[] = await authenticatorsRes.json(); const otpAuthenticator = authenticators.find(auth => auth.type === 'otp');
      if (!otpAuthenticator) { return NextResponse.json({ success: true, message: "MFA (OTP) no estaba activado." });}
      const deleteResponse = await fetch(`https://${auth0Domain}/api/v2/users/${usuario.auth0Id}/authenticators/${otpAuthenticator.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${managementApiToken}` }}); // Corrected to use managementApiToken
      if (!deleteResponse.ok) { const error = await deleteResponse.json(); console.error("Auth0 MFA disable error:", error); return NextResponse.json({ error: error.message || "Error al desactivar MFA" }, { status: deleteResponse.status });}
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error en API MFA (/api/auth/mfa):", error);
    if (error.message.startsWith("AUTH0_") || error.message.startsWith("Error obtaining Auth0 Management API token") || error.message.startsWith("Error obteniendo token para Authentication API")) {
        return NextResponse.json({ error: "Error de configuración del servidor de autenticación" }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
