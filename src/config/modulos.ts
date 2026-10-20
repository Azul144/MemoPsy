// src/config/modulos.ts
// Única fuente de verdad de los módulos del sistema (menú y panel de bienvenida).
// Antes esta lista estaba copiada en 15 páginas; ahora todas la importan desde acá.
// Para agregar o cambiar un módulo (ruta, ícono, descripción o permisos), se edita solo este archivo.
import { Users, Calendar, Shield, FileText, type LucideIcon } from "lucide-react";

export interface ModuloConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: LucideIcon;
  ruta: string;
  permisosRequeridos: string[]; // Alcanza con tener UNO de estos permisos para ver el módulo.
}

export const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Altas, datos y estado de las cuentas del consultorio",
    icon: Users,
    ruta: "/usuarios",
    permisosRequeridos: ["Ver Usuarios", "Registrar Usuario", "Editar Usuario", "Eliminar Usuario"],
  },
  {
    id: "sesiones",
    nombre: "Sesiones",
    descripcion: "Agenda de turnos, presenciales y por videollamada",
    icon: Calendar,
    ruta: "/sesiones",
    permisosRequeridos: ["Ver Sesiones", "Registrar Sesión", "Editar Sesión", "Eliminar Sesión", "Asignar Profesional"],
  },
  {
    id: "perfiles",
    nombre: "Perfiles",
    descripcion: "Qué puede ver y hacer cada rol",
    icon: Shield,
    ruta: "/perfiles",
    permisosRequeridos: ["Ver Perfiles", "Registrar Perfil", "Editar Perfil", "Eliminar Perfil", "Asignar Perfil"],
  },
  {
    id: "informes",
    nombre: "Informes",
    descripcion: "Notas clínicas e informes de cada paciente",
    icon: FileText,
    ruta: "/informes",
    permisosRequeridos: ["Ver Informes", "Registrar Informe", "Editar Informe", "Eliminar Informe"],
  },
];
