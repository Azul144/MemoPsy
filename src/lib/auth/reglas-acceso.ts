// src/lib/auth/reglas-acceso.ts
// Control de acceso por rol (RF 4.1 y RF 4.2 del TIF).
// Cada regla dice qué permisos hacen falta para entrar a una página o usar una API.
// Alcanza con tener UNO de los permisos de la lista.
// El middleware revisa estas reglas en CADA pedido, antes de llegar a la página o a la API.
//
// Importante: si una ruta de la API no figura acá, queda BLOQUEADA (se deniega por defecto).
// Así, si en el futuro se agrega una API nueva y nadie le define permisos, no queda abierta.

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Regla {
  ruta: string; // "[id]" = cualquier valor en esa parte de la dirección
  metodos?: Metodo[]; // si no se indica, vale para todos
  permisos: string[] | "cualquiera"; // "cualquiera" = alcanza con haber iniciado sesión
}

// Grupos de permisos que se repiten
const VER_USUARIOS = ["Ver Usuarios"];
const GESTIONA_USUARIOS = ["Registrar Usuario", "Editar Usuario"];
const GESTIONA_PERFILES = ["Ver Perfiles", "Registrar Perfil", "Editar Perfil"];
const AGENDA = ["Ver Sesiones", "Registrar Sesión", "Editar Sesión"];
// Ver la lista de pacientes: NO alcanza con "Ver Sesiones" ni "Ver Informes",
// porque el paciente también tiene esos permisos (para ver lo suyo).
const BUSCA_PACIENTES = ["Registrar Sesión", "Editar Sesión", "Registrar Informe", "Editar Informe", "Ver Usuarios"];

// ----- PÁGINAS -----
export const REGLAS_PAGINAS: Regla[] = [
  { ruta: "/welcome", permisos: "cualquiera" },
  { ruta: "/usuarios/registrar", permisos: ["Registrar Usuario"] },
  { ruta: "/usuarios/editar/[id]", permisos: ["Editar Usuario"] },
  { ruta: "/usuarios/listar", permisos: VER_USUARIOS },
  { ruta: "/usuarios", permisos: [...VER_USUARIOS, ...GESTIONA_USUARIOS] },
  { ruta: "/perfiles/registrar", permisos: ["Registrar Perfil"] },
  { ruta: "/perfiles/editar/[id]", permisos: ["Editar Perfil"] },
  { ruta: "/perfiles/listar", permisos: ["Ver Perfiles"] },
  { ruta: "/perfiles", permisos: GESTIONA_PERFILES },
  { ruta: "/sesiones", permisos: AGENDA },
  { ruta: "/informes/registrar", permisos: ["Registrar Informe"] },
  { ruta: "/informes/editar/[id]", permisos: ["Editar Informe"] },
  { ruta: "/informes/detalle/[id]", permisos: ["Ver Informes"] },
  { ruta: "/informes/lista", permisos: ["Ver Informes"] },
  { ruta: "/informes", permisos: ["Ver Informes", "Registrar Informe"] },
];

// ----- API -----
export const REGLAS_API: Regla[] = [
  // Cuenta propia
  { ruta: "/api/auth/mfa", permisos: "cualquiera" },
  { ruta: "/api/usuarios/me", metodos: ["GET"], permisos: "cualquiera" },

  // Usuarios
  { ruta: "/api/usuarios", metodos: ["GET"], permisos: VER_USUARIOS },
  { ruta: "/api/usuarios", metodos: ["POST"], permisos: ["Registrar Usuario"] },
  { ruta: "/api/usuarios/[id]", metodos: ["GET"], permisos: [...VER_USUARIOS, "Editar Usuario"] },
  { ruta: "/api/usuarios/[id]", metodos: ["PUT", "PATCH"], permisos: ["Editar Usuario"] },
  { ruta: "/api/usuarios/[id]", metodos: ["DELETE"], permisos: ["Eliminar Usuario"] },
  { ruta: "/api/usuarios/[id]/estado", metodos: ["PATCH"], permisos: ["Editar Usuario"] },
  { ruta: "/api/usuarios/[id]/toggle-status", metodos: ["PATCH"], permisos: ["Editar Usuario"] },
  { ruta: "/api/usuarios/[id]/change-password", metodos: ["POST"], permisos: ["Editar Usuario"] },
  { ruta: "/api/usuarios/[id]/perfiles", metodos: ["GET"], permisos: [...VER_USUARIOS, "Editar Usuario", "Asignar Perfil"] },
  { ruta: "/api/usuarios/[id]/perfiles", metodos: ["PUT"], permisos: ["Editar Usuario", "Asignar Perfil"] },
  { ruta: "/api/personas", metodos: ["GET"], permisos: [...VER_USUARIOS, ...GESTIONA_USUARIOS] },
  { ruta: "/api/personas", metodos: ["POST"], permisos: ["Registrar Usuario"] },
  { ruta: "/api/personas/[id]", metodos: ["GET"], permisos: [...VER_USUARIOS, ...GESTIONA_USUARIOS] },
  { ruta: "/api/obras-sociales", metodos: ["GET"], permisos: [...GESTIONA_USUARIOS, ...VER_USUARIOS, ...AGENDA] },
  { ruta: "/api/obras-sociales/editar", metodos: ["GET"], permisos: [...GESTIONA_USUARIOS, ...VER_USUARIOS] },
  { ruta: "/api/obras-sociales/[id]", metodos: ["GET"], permisos: [...GESTIONA_USUARIOS, ...VER_USUARIOS, ...AGENDA] },
  { ruta: "/api/obras-sociales/[id]", metodos: ["PUT"], permisos: ["Editar Usuario"] },
  { ruta: "/api/obras-sociales/[id]", metodos: ["DELETE"], permisos: ["Eliminar Usuario"] },

  // Pacientes y psicólogos
  { ruta: "/api/pacientes", metodos: ["GET"], permisos: BUSCA_PACIENTES },
  { ruta: "/api/pacientes/buscar", metodos: ["GET"], permisos: BUSCA_PACIENTES },
  { ruta: "/api/pacientes/[id]", metodos: ["GET"], permisos: BUSCA_PACIENTES },
  { ruta: "/api/pacientes/[id]", metodos: ["PUT"], permisos: ["Editar Usuario"] },
  { ruta: "/api/pacientes/[id]", metodos: ["DELETE"], permisos: ["Eliminar Usuario"] },
  { ruta: "/api/psicologos", metodos: ["GET"], permisos: [...AGENDA, "Asignar Profesional", ...VER_USUARIOS] },
  { ruta: "/api/psicologos/buscar", metodos: ["GET"], permisos: [...AGENDA, "Asignar Profesional", ...VER_USUARIOS] },
  { ruta: "/api/psicologos/[id]", metodos: ["GET"], permisos: [...AGENDA, "Asignar Profesional", ...VER_USUARIOS] },

  // Perfiles y permisos
  { ruta: "/api/perfiles", metodos: ["GET"], permisos: [...GESTIONA_PERFILES, ...GESTIONA_USUARIOS, ...VER_USUARIOS, "Asignar Perfil"] },
  { ruta: "/api/perfiles", metodos: ["POST"], permisos: ["Registrar Perfil"] },
  { ruta: "/api/perfiles/usuarios", metodos: ["GET"], permisos: ["Ver Perfiles", "Asignar Perfil"] },
  { ruta: "/api/perfiles/[id]", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/perfiles/[id]", metodos: ["PUT"], permisos: ["Editar Perfil"] },
  { ruta: "/api/perfiles/[id]", metodos: ["DELETE"], permisos: ["Eliminar Perfil"] },
  { ruta: "/api/permisos", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/permisos/[id]", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/permisos/[id]", metodos: ["PUT", "DELETE"], permisos: ["Editar Perfil"] },
  { ruta: "/api/modulos", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/modulos", metodos: ["POST"], permisos: ["Editar Perfil"] },
  { ruta: "/api/modulos/[id]", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/modulos/[id]", metodos: ["PUT", "DELETE"], permisos: ["Editar Perfil"] },
  { ruta: "/api/acciones", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/acciones", metodos: ["POST"], permisos: ["Editar Perfil"] },
  { ruta: "/api/acciones/[id]", metodos: ["GET"], permisos: GESTIONA_PERFILES },
  { ruta: "/api/acciones/[id]", metodos: ["PUT", "DELETE"], permisos: ["Editar Perfil"] },

  // Sesiones (agenda)
  { ruta: "/api/sesiones", metodos: ["GET"], permisos: ["Ver Sesiones"] },
  { ruta: "/api/sesiones", metodos: ["POST"], permisos: ["Registrar Sesión"] },
  { ruta: "/api/sesiones/[id]", metodos: ["GET"], permisos: ["Ver Sesiones"] },
  { ruta: "/api/sesiones/[id]", metodos: ["PUT", "PATCH"], permisos: ["Editar Sesión", "Asignar Profesional"] },
  { ruta: "/api/sesiones/[id]", metodos: ["DELETE"], permisos: ["Eliminar Sesión"] },
  { ruta: "/api/estados", metodos: ["GET"], permisos: AGENDA },
  { ruta: "/api/estados/[id]", metodos: ["GET"], permisos: AGENDA },
  { ruta: "/api/estados/[id]", metodos: ["PUT", "DELETE"], permisos: ["Eliminar Sesión"] },
  { ruta: "/api/modalidades", metodos: ["GET"], permisos: AGENDA },
  { ruta: "/api/modalidades/[id]", metodos: ["GET"], permisos: AGENDA },
  { ruta: "/api/modalidades/[id]", metodos: ["PUT", "DELETE"], permisos: ["Eliminar Sesión"] },

  // Informes (notas clínicas)
  { ruta: "/api/informes", metodos: ["GET"], permisos: ["Ver Informes"] },
  { ruta: "/api/informes", metodos: ["POST"], permisos: ["Registrar Informe"] },
  { ruta: "/api/informes/[id]", metodos: ["GET"], permisos: ["Ver Informes"] },
  { ruta: "/api/informes/[id]", metodos: ["PUT"], permisos: ["Editar Informe"] },
  { ruta: "/api/informes/[id]", metodos: ["DELETE"], permisos: ["Eliminar Informe"] },
];

// "/api/usuarios/[id]/estado" → /^\/api\/usuarios\/[^/]+\/estado\/?$/
function aExpresion(ruta: string): RegExp {
  const partes = ruta.split("/").map((p) => (p === "[id]" ? "[^/]+" : p.replace(/[.*+?^${}()|\\]/g, "\\$&")));
  return new RegExp(`^${partes.join("/")}/?$`);
}

function buscarRegla(reglas: Regla[], ruta: string, metodo: string): Regla | undefined {
  return reglas.find(
    (r) => aExpresion(r.ruta).test(ruta) && (!r.metodos || r.metodos.includes(metodo as Metodo))
  );
}

function cumple(regla: Regla, permisosUsuario: string[]): boolean {
  if (regla.permisos === "cualquiera") return true;
  return regla.permisos.some((p) => permisosUsuario.includes(p));
}

// ¿Puede esta persona usar esta ruta con este método?
export function tieneAcceso(ruta: string, metodo: string, permisosUsuario: string[]): boolean {
  const esApi = ruta.startsWith("/api/");
  const regla = buscarRegla(esApi ? REGLAS_API : REGLAS_PAGINAS, ruta, metodo);
  if (!regla) {
    // API sin regla: se bloquea. Página sin regla: se deja pasar (no hay datos en la página en sí).
    return !esApi;
  }
  return cumple(regla, permisosUsuario);
}
