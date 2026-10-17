import Link from "next/link";
import Encabezado from "@/app/components/Encabezado";
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
        <section id="inicio" className="px-4 pt-28 pb-20 text-center">
          <h1 className="text-5xl font-bold sm:text-7xl">
            <span className="block text-white">MemoPsy</span>
            <span className="block text-primary">All-In-One.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Optimizá tu práctica psicológica con gestión segura y seguimiento
            inteligente. La herramienta web todo-en-uno para notas clínicas,
            agenda integrada y protección de datos sensibles.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <a
              href="#contacto"
              className="rounded-md border border-primary px-7 py-3 font-semibold text-primary"
            >
              Contáctenos
            </a>
            <Link
              href="/login"
              className="rounded-md bg-primary px-7 py-3 font-semibold text-primary-foreground"
            >
              Iniciar Sesión
            </Link>
          </div>
        </section>

        <Funciones />
        <Modulos />
        <Contacto />
        <Testimonios />
        <PorQue />
        <PiePagina />
      </main>
    </>
  );
}