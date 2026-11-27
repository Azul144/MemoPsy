import Encabezado from "@/components/landing/Encabezado";
import Portada from "@/components/landing/Portada";
import Funciones from "@/components/landing/Funciones";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Contacto from "@/components/landing/Contacto";
import Seguridad from "@/components/landing/Seguridad";
import ParaQuien from "@/components/landing/ParaQuien";
import LoQueCambia from "@/components/landing/LoQueCambia";
import PiePagina from "@/components/landing/PiePagina";
import AnimarAlScroll from "@/components/landing/AnimarAlScroll";

export default function Home() {
  // La portada queda siempre en modo oscuro, aunque el sistema esté en modo claro
  return (
    <div className="tema-oscuro bg-background">
      <Encabezado />
      <main className="min-h-screen bg-background text-foreground">
        <Portada />
        <LoQueCambia />
        <ParaQuien />
        <Funciones />
        <ComoFunciona />
        <Seguridad />
        <Contacto />
        <PiePagina />
        <AnimarAlScroll />
      </main>
    </div>
  );
}
