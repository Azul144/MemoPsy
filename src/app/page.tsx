import Encabezado from "@/components/landing/Encabezado";
import Portada from "@/components/landing/Portada";
import Cifras from "@/components/landing/Cifras";
import Funciones from "@/components/landing/Funciones";
import Modulos from "@/components/landing/Modulos";
import Contacto from "@/components/landing/Contacto";
import Testimonios from "@/components/landing/Testimonios";
import PorQue from "@/components/landing/PorQue";
import PiePagina from "@/components/landing/PiePagina";

export default function Home() {
  // La portada queda siempre en modo oscuro, aunque el sistema esté en modo claro
  return (
    <div className="tema-oscuro bg-background">
      <Encabezado />
      <main className="min-h-screen bg-background text-foreground">
        <Portada />
        <Cifras />
        <Funciones />
        <Modulos />
        <Testimonios />
        <PorQue />
        <Contacto />
        <PiePagina />
      </main>
    </div>
  );
}
