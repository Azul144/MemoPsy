// app/(auth)/login/page.tsx
// app/(auth)/login/page.tsx
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
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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


/*
  const handlePasswordReset = async () => {
    if (!email) {
      setError('Por favor, ingresa tu email para recuperar la contraseña.');
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      // Verifica si el usuario existe
      const checkUserResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!checkUserResponse.ok) {
        throw new Error('Usuario no encontrado');
      }

      const resetTimestamp = Date.now();
      const expirationTime = resetTimestamp + (60 * 60 * 1000); // 1 hora

      const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}&timestamp=${resetTimestamp}&expires=${expirationTime}`;

      // Enviar al backend que se encargue del correo
      const response = await fetch('/api/auth/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetUrl })
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
*/
    

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
        
       
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isResetting}
            className="text-sm text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
          >
            {isResetting ? 'Enviando...' : '¿Olvidó su contraseña?'}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
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