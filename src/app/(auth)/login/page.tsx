// src/app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react'; // Added useEffect
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MfaVerificationModal from "@/components/mfa-verification-modal"; // Import the MFA modal
import { Loader2 } from 'lucide-react'; // For loading state

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Added for general loading state

  // MFA State
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [mfaLoginData, setMfaLoginData] = useState<{ email: string, password?: string } | null>(null); // Password optional if not needed by modal directly

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading error from URL

  useEffect(() => {
    const nextAuthError = searchParams.get('error');
    if (nextAuthError) {
      // Map NextAuth error codes to user-friendly messages if needed
      if (nextAuthError === "CredentialsSignin") {
        setError("Email o contraseña incorrectos.");
      } else if (nextAuthError === "MFA_REQUIRED") {
         // This case should ideally be handled by showing the modal,
         // but if redirected here, it means direct navigation or an issue.
        setError("Se requiere autenticación de dos factores.");
      } else if (nextAuthError === "INVALID_MFA_CODE") {
        setError("Código de autenticación de dos factores inválido.");
      } else {
        setError("Error de autenticación. Inténtalo de nuevo.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Check if MFA is required for the user
      const mfaCheckResponse = await fetch('/api/auth/check-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!mfaCheckResponse.ok) {
        // If check-mfa itself fails, treat as a general error
        // (unless specific errors from check-mfa need to be handled)
        setError('Error al verificar el estado de 2FA. Inténtalo de nuevo.');
        setIsLoading(false);
        return;
      }

      const mfaCheckData = await mfaCheckResponse.json();

      if (mfaCheckData.mfaRequired) {
        // 2a. MFA is required. Try to pre-authenticate (check password without full login)
        const preAuthResult = await signIn('credentials', {
          redirect: false,
          email,
          password,
          skipMfa: 'true', // Send as string, matching authConfig
        });

        if (preAuthResult?.error) {
          if (preAuthResult.error === 'INVALID_PRIMARY_CREDENTIALS' || preAuthResult.error === 'EMAIL_OR_PASSWORD_MISSING') {
            setError('Email o contraseña incorrectos.');
          } else {
            setError('Error de autenticación. Inténtalo de nuevo.');
          }
        } else if (preAuthResult?.ok) {
          // Primary credentials are correct, show MFA modal
          setMfaLoginData({ email, password }); // Store credentials for MFA step
          setShowMfaVerification(true);
        } else {
            setError('Error inesperado durante la pre-autenticación.');
        }
      } else {
        // 2b. MFA is NOT required. Proceed with normal login.
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          if (result.error === 'INVALID_PRIMARY_CREDENTIALS' || result.error === 'EMAIL_OR_PASSWORD_MISSING') {
            setError('Email o contraseña incorrectos.');
          } else {
             setError('Error de autenticación. Inténtalo de nuevo.');
          }
        } else if (result?.ok) {
          router.push('/welcome');
          router.refresh(); // Ensure session is updated client-side
        } else {
            setError('Error inesperado durante el inicio de sesión.');
        }
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (mfaCode: string): Promise<boolean> => {
    if (!mfaLoginData?.email || !mfaLoginData?.password) {
      setError("Error interno: faltan datos de inicio de sesión para 2FA."); // Should not happen
      return false;
    }
    setIsLoading(true); // Use general loading for MFA verification step
    let success = false;
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: mfaLoginData.email,
        password: mfaLoginData.password,
        mfaCode: mfaCode,
      });

      if (result?.error) {
        console.error("MFA verification error from signIn:", result.error);
        // Error already set by MfaVerificationModal based on return false
        // setError(result.error === 'INVALID_MFA_CODE' ? 'Código 2FA inválido.' : 'Error en la verificación 2FA.');
        success = false;
      } else if (result?.ok) {
        setShowMfaVerification(false); // Close modal on success
        router.push('/welcome');
        router.refresh();
        success = true;
      } else {
        // setError('Error inesperado durante la verificación 2FA.');
        success = false;
      }
    } catch (err) {
      console.error("Error en handleVerifyMfa:", err);
      // setError('Ocurrió un error inesperado al verificar 2FA.');
      success = false;
    } finally {
      setIsLoading(false);
    }
    return success;
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Por favor, ingresa tu email para recuperar la contraseña.');
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      // Verificar que el usuario existe antes de enviar el correo
      const checkUserResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (!checkUserResponse.ok) {
        throw new Error('Usuario no encontrado');
      }

      // Generar timestamp para validación (válido por 1 hora)
      const resetTimestamp = Date.now();
      const expirationTime = resetTimestamp + (60 * 60 * 1000); // 1 hora en milisegundos
      
      // Crear enlace con timestamp y email
      const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}&timestamp=${resetTimestamp}&expires=${expirationTime}`;

      const formData = new FormData();
      formData.append('access_key', 'b4588913-df5b-4c31-95f4-eb68d01cdf80'); // Reemplaza con tu access key real
      formData.append('subject', 'MemoPsy - Recuperación de Contraseña');
      formData.append('from_name', 'MemoPsy - Sistema de Autenticación');
      formData.append('email', email);
      formData.append('message', `
        Hola,

        Has solicitado recuperar tu contraseña para tu cuenta de MemoPsy.

        Haz clic en el siguiente enlace para crear una nueva contraseña:
        ${resetUrl}

        Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.

        Por seguridad, solo se puede usar este enlace una vez y dentro del tiempo límite.

        Saludos,
        El equipo de MemoPsy
      `);

      // Campos ocultos adicionales para el contexto
      formData.append('botcheck', '');
      formData.append('Tipo_solicitud', 'Recuperación de contraseña');
      formData.append('Usuario_email', email);
      formData.append('Timestamp_solicitud', new Date().toISOString());

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setResetEmailSent(true);
      } else {
        throw new Error('Error al enviar el correo');
      }
    } catch (err) {
      console.error("Password reset error:", err);
      if (err instanceof Error && err.message === 'Usuario no encontrado') {
        setError('No se encontró una cuenta con ese email.');
      } else {
        setError('Error al enviar el correo de recuperación. Inténtalo de nuevo.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
        <div className="p-8 rounded-2xl shadow-2xl w-full max-w-md" style={{ backgroundColor: '#1D3434' }}>
          <MemopsyLogo />
          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold mb-4" style={{ color: '#F1C77A' }}>
              Correo Enviado
            </h1>
            <p className="text-white mb-4">
              Se ha enviado un enlace de recuperación a <strong>{email}</strong>.
            </p>
            <p className="text-gray-300 mb-6 text-sm">
              Revisa tu bandeja de entrada y sigue las instrucciones. El enlace es válido por 1 hora.
            </p>
            <Button 
              onClick={() => {
                setResetEmailSent(false);
                setEmail('');
              }}
              variant="outline" 
              className="w-full"
            >
              Volver al Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
      <div className="p-8 rounded-2xl shadow-2xl w-full max-w-md" style={{ backgroundColor: '#1D3434' }}>
        <MemopsyLogo />
        <h1 className="text-2xl font-bold text-center mt-4 mb-6" style={{ color: '#F1C77A' }}>Iniciar Sesión</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email:</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder='Correo electrónico'
              className="mt-1"
              disabled={isLoading || isResetting}
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña:</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='Contraseña'
              className="mt-1 white" // Assuming 'white' is a custom class for text color
              disabled={isLoading || isResetting}
            />
          </div>
          {error && <p className="text-red-500 text-center text-sm py-1">{error}</p>}
          <Button type="submit" variant="outline" className="w-full" disabled={isLoading || isResetting}>
            {isLoading && !showMfaVerification ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Ingresar
          </Button>
        </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isResetting || isLoading}
              className="text-sm text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
            >
              {isResetting ? 'Enviando...' : '¿Olvidó su contraseña?'}
            </button>
          </div>
        </div>
        {mfaLoginData?.email && ( // Ensure email is present before rendering modal
        <MfaVerificationModal
            isOpen={showMfaVerification}
            onClose={() => {
                setShowMfaVerification(false);
                setMfaLoginData(null); // Clear MFA login data on close
                setError(null); // Clear any previous errors
            }}
            onVerify={handleVerifyMfa}
            email={mfaLoginData.email}
        />
      )}
      </div>
  );
}

/*
// src/app/(auth)/login/page.tsx
'use client'; // Necesario para hooks y manejo de eventos

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Usar 'next/navigation' en App Router
import MemopsyLogo from "@/app/components/MemopsyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null); // Limpiar errores previos

    try {
      const result = await signIn('credentials', {
        redirect: false, // No redirigir automáticamente, manejaremos manualmente
        email: email,
        password: password,
      });

      if (result?.error) {
        // Manejar errores de autenticación (ej. credenciales incorrectas)
        console.error("Login error:", result.error);
        setError('Email o contraseña incorrectos.');
      } else if (result?.ok) {
        // Inicio de sesión exitoso, redirigir al dashboard o página principal
        router.push('/welcome'); // O la ruta deseada después del login
        router.refresh(); // Asegura que el estado del servidor se actualice
      }
    } catch (err) {
       console.error("Unexpected login error:", err);
       setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#152A2A' }}>
      <div className="p-8 rounded-2xl shadow-2xl w-full max-w-md" style={{ backgroundColor: '#1D3434' }}>
        <MemopsyLogo />
        <h1 className="text-2xl font-bold text-center mt-4 mb-6" style={{ color: '#F1C77A' }}>Iniciar Sesión</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email:</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder='Correo electrónico'
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña:</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='Contraseña'
              className="mt-1 white"
            />
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <Button type="submit" variant="outline" className="w-full">Ingresar</Button>
        </form>
      </div>
    </div>
  );
}
*/

/*
'use client'; // Necesario para hooks y manejo de eventos

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Usar 'next/navigation' en App Router

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null); // Limpiar errores previos

    try {
      const result = await signIn('credentials', {
        redirect: false, // No redirigir automáticamente, manejaremos manualmente
        email: email,
        password: password,
      });

      if (result?.error) {
        // Manejar errores de autenticación (ej. credenciales incorrectas)
        console.error("Login error:", result.error);
        setError('Email o contraseña incorrectos.');
      } else if (result?.ok) {
        // Inicio de sesión exitoso, redirigir al dashboard o página principal
        router.push('/dashboard'); // O la ruta deseada después del login
        router.refresh(); // Asegura que el estado del servidor se actualice
      }
    } catch (err) {
       console.error("Unexpected login error:", err);
       setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    }
  };

  return (
    <div>
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Ingresar</button>
      </form>
      <p>¿No tienes cuenta? <a href="/register">Regístrate</a></p>
    </div>
  );
}*/