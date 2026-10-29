// src/components/proveedores/NextAuthProvider.tsx
// Envuelve la aplicación con el SessionProvider de NextAuth, para que las pantallas puedan leer la sesión con useSession().
'use client'; // ¡Importante! Este componente debe ser cliente

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface Props {
    children: React.ReactNode;
}

export default function NextAuthProvider({ children }: Props) {
    // SessionProvider necesita ser un Client Component.
    // refetchOnWindowFocus={false}: por defecto NextAuth vuelve a pedir la sesión cada vez que la
    // persona vuelve a la pestaña; eso entrega un objeto "session" nuevo, las pantallas que dependen
    // de él vuelven a cargar todo y se pierde lo que se estaba completando (diálogos, formularios).
    // La seguridad no cambia: el middleware valida la sesión en cada pedido al servidor.
    return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}