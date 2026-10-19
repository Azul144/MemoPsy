// src/app/(main)/layout.tsx
// Diseño común de todas las pantallas internas (usuarios, sesiones, perfiles, informes)
import BarraSistema from "@/components/sistema/BarraSistema";

export default function LayoutSistema({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-crema">
      <BarraSistema />
      {children}
    </div>
  );
}
