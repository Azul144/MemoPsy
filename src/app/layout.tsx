import type { Metadata } from "next";
// Tipografía guardada dentro del proyecto (no depende de Google Fonts):
// Plus Jakarta Sans para todo el sistema
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import NextAuthProvider from "@/app/components/NextAuthProvider";
import { Toaster } from "react-hot-toast";

// Aplica el modo elegido (claro u oscuro) antes de dibujar, para que no parpadee al cargar
const SCRIPT_TEMA = `try{if(localStorage.getItem("memopsy-tema")==="claro")document.documentElement.classList.add("claro")}catch(e){}`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">
        {/* Envuelve todo con el Provider de NextAuth */}
        <NextAuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--card)",
                color: "var(--crema)",
                border: "1px solid var(--borde)",
                borderRadius: "1rem",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "var(--exito)", secondary: "var(--card)" } },
              error: { iconTheme: { primary: "var(--peligro)", secondary: "var(--card)" } },
            }}
          />
        </NextAuthProvider>
      </body>
    </html>
  );
}
