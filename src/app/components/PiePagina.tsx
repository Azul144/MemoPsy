import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";

const contacto = {
  direccion: "Av. 25 de Mayo 450, Oficina 2",
  ciudad: "Formosa (P3600), Argentina",
  telefono: "+54 370 400-1234",
  email: "contacto@memopsy.com",
};

export default function PiePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer id="sobre-nosotros" className="border-t border-foreground/10 bg-card px-6">
      <div className="mx-auto grid max-w-7xl gap-12 py-16 md:grid-cols-3">

        {/* Columna 1: Sobre nosotros */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Sobre nosotros</h2>
          <div className="mt-6 space-y-3 text-foreground/85">
            <p className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-dorado" />
              <span>
                {contacto.direccion}
                <br />
                {contacto.ciudad}
              </span>
            </p>
            <p className="flex gap-3">
              <Phone className="h-5 w-5 shrink-0 text-dorado" />
              {contacto.telefono}
            </p>
            <p className="flex gap-3">
              <Mail className="h-5 w-5 shrink-0 text-dorado" />
              <a href={`mailto:${contacto.email}`} className="hover:text-dorado">
                {contacto.email}
              </a>
            </p>
          </div>
        </div>

        {/* Columna 2: Acceso */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Acceso</h2>
          <ul className="mt-6 space-y-3 text-foreground/85">
            <li><a href="#inicio" className="hover:text-dorado">Inicio</a></li>
            <li><a href="#funciones" className="hover:text-dorado">Funciones</a></li>
            <li><a href="#modulos" className="hover:text-dorado">Módulos</a></li>
            <li><a href="#testimonios" className="hover:text-dorado">Testimonios</a></li>
            <li><a href="#por-que" className="hover:text-dorado">¿Por qué MemoPsy?</a></li>
            <li><a href="#contacto" className="hover:text-dorado">Pedir una demostración</a></li>
            <li><Link href="/login" className="hover:text-dorado">Iniciar sesión</Link></li>
          </ul>
        </div>

        {/* Columna 3: Marca */}
        <div className="md:text-right">
          <div className="flex items-center gap-3 md:justify-end">
            <Image src="/assets/logopng.png" alt="Logo de MemoPsy" width={36} height={44} />
            <span className="titulo text-2xl font-semibold text-dorado">MemoPsy</span>
          </div>
          <p className="mt-4 text-foreground/80">
            En MemoPsy impulsamos la psicología moderna con herramientas intuitivas y seguras,
            pensadas para consultorios de psicología clínica de Formosa.
          </p>
          <div className="mt-6 grid grid-cols-3 border border-foreground/15 text-center text-sm font-semibold text-dorado">
            <span className="py-3">NOTAS</span>
            <span className="border-x border-foreground/15 py-3">MEMOPSY</span>
            <span className="py-3">PSICOLOGÍA</span>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl border-t border-foreground/10 py-6 text-center text-sm text-foreground/70">
        © {anio} MemoPsy. Todos los derechos reservados.
      </div>
    </footer>
  );
}