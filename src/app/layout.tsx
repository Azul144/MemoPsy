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
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1D3434",
                color: "#F6EFE2",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "1rem",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#6EE7B7", secondary: "#1D3434" } },
              error: { iconTheme: { primary: "#F87171", secondary: "#1D3434" } },
            }}
          />
        </NextAuthProvider>
      </body>
    </html>
  );
}
