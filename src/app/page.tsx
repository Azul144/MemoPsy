import Encabezado from "@/app/components/Encabezado";
import Portada from "@/app/components/Portada";
import Funciones from "@/app/components/Funciones";
import Modulos from "@/app/components/Modulos";
import Contacto from "@/app/components/Contacto";
import Testimonios from "@/app/components/Testimonios";
import PorQue from "@/app/components/PorQue";
import PiePagina from "@/app/components/PiePagina";

export default function Home() {
  return (
    <>
      <Encabezado />
      <main className="min-h-screen bg-background text-foreground">
        <Portada />
        <Funciones />
        <Modulos />
        <Testimonios />
        <PorQue />
        <Contacto />
        <PiePagina />
      </main>
    </>
  );
}
