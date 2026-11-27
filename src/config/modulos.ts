// src/config/modulos.ts
// Única fuente de verdad de los módulos del sistema (menú y panel de bienvenida).
// Antes esta lista estaba copiada en 15 páginas; ahora todas la importan desde acá.
// Para agregar o cambiar un módulo (ruta, ícono, descripción o permisos), se edita solo este archivo.
import { Users, Calendar, Shield, FileText, ScrollText, type LucideIcon } from "lucide-react";

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
    nombre: "Turnos",
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
  {
    id: "auditoria",
    nombre: "Auditoría",
    descripcion: "Registro de ingresos y cambios sobre datos sensibles (solo lectura)",
    icon: ScrollText,
    ruta: "/auditoria",
    permisosRequeridos: ["Ver Auditoría"],
  },
];

// Del lado del paciente se habla de "sesiones" (el psicólogo da turnos, el paciente tiene sesiones).
// Para quien es solo paciente, el módulo de la agenda se llama "Mis sesiones".
export function modulosParaUsuario(
  modulos: ModuloConfig[],
  usuario?: { pacienteId?: string | number | null; psicologoId?: string | number | null } | null,
): ModuloConfig[] {
  if (!usuario?.pacienteId || usuario.psicologoId) return modulos;
  return modulos.map((m) =>
    m.id === "sesiones" ? { ...m, nombre: "Mis sesiones", descripcion: "Tus sesiones en el calendario, presenciales y por videollamada" } : m,
  );
}
