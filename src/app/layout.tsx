import type { Metadata } from "next";
// Tipografía guardada dentro del proyecto (no depende de Google Fonts):
// Plus Jakarta Sans para todo el sistema
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import NextAuthProvider from "@/app/components/NextAuthProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "MemoPsy | Notas & Psicología",
  description:
    "MemoPsy: sistema web para consultorios de psicología clínica. Notas cifradas, informes, agenda con recordatorios y acceso por roles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {/* Envuelve todo con el Provider de NextAuth */}
        <NextAuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
        </NextAuthProvider>
      </body>
    </html>
  );
}
