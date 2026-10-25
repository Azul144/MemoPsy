// src/lib/historia-clinica/apartados.ts
// Apartados de la historia clínica, con sus títulos y ayudas. Lo usan la pantalla, la API y el PDF
// (no depende de la base, así se puede importar desde el navegador).

export const MOTIVOS_CIERRE = ["ALTA", "ABANDONO", "DERIVACION", "OTRO"] as const;
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number];

export const NOMBRE_MOTIVO_CIERRE: Record<MotivoCierre, string> = {
  ALTA: "Alta terapéutica",
  ABANDONO: "Abandono del tratamiento",
  DERIVACION: "Derivación",
  OTRO: "Otro",
};

// Datos de identificación que no están en la ficha del paciente (renglón corto)
export const CAMPOS_IDENTIFICACION = [
  { campo: "estadoCivil", titulo: "Estado civil", ayuda: "Ej: soltera, casado, en pareja" },
  { campo: "ocupacion", titulo: "Ocupación", ayuda: "Ej: administrativa, estudiante de 2.º año" },
  { campo: "escolaridad", titulo: "Escolaridad", ayuda: "Ej: secundario completo, 3.er grado" },
  { campo: "convivencia", titulo: "Con quién vive", ayuda: "Ej: con su madre y un hermano" },
  { campo: "contactoEmergencia", titulo: "Contacto de emergencia", ayuda: "Nombre, vínculo y teléfono" },
  { campo: "derivadoPor", titulo: "Derivado por", ayuda: "Ej: consulta espontánea, médico clínico, escuela" },
] as const;

// Apartados de la admisión (texto largo), en el orden de la historia clínica
export const APARTADOS_ADMISION = [
  {
    campo: "motivoConsulta",
    titulo: "Motivo de consulta",
    ayuda: "Por qué consulta, en lo posible con sus propias palabras.",
  },
  {
    campo: "historiaProblema",
    titulo: "Historia del problema actual",
    ayuda: "Desde cuándo, cómo empezó, qué lo empeora o lo alivia, qué intentó antes.",
  },
  {
    campo: "antecedentesPersonales",
    titulo: "Antecedentes personales",
    ayuda: "Salud, tratamientos psicológicos o psiquiátricos previos, medicación, consumos, hechos vitales.",
  },
  {
    campo: "antecedentesFamiliares",
    titulo: "Antecedentes familiares",
    ayuda: "Composición familiar, vínculos y antecedentes de salud mental en la familia.",
  },
  {
    campo: "examenMental",
    titulo: "Examen del estado mental",
    ayuda: "Aspecto, conciencia y orientación, atención, memoria, pensamiento, afecto, sensopercepción, juicio y evaluación de riesgo.",
  },
  {
    campo: "evaluaciones",
    titulo: "Evaluaciones y tests aplicados",
    ayuda: "Técnicas o tests administrados, con fecha y resultados principales.",
  },
  {
    campo: "impresionDiagnostica",
    titulo: "Impresión diagnóstica presuntiva",
    ayuda: "Hipótesis diagnóstica; podés agregar el código CIE-10 o DSM-5.",
  },
  {
    campo: "planTratamiento",
    titulo: "Plan de tratamiento",
    ayuda: "Objetivos, enfoque, frecuencia y modalidad de las sesiones.",
  },
] as const;

export const CAMPOS_TEXTO_HISTORIA = [
  ...CAMPOS_IDENTIFICACION.map((c) => c.campo),
  ...APARTADOS_ADMISION.map((a) => a.campo),
  "epicrisis",
] as const;
export type CampoTextoHistoria = (typeof CAMPOS_IDENTIFICACION)[number]["campo"] | (typeof APARTADOS_ADMISION)[number]["campo"] | "epicrisis";

// Edad en años cumplidos a una fecha dada (las dos en formato AAAA-MM-DD)
export function edadEn(nacimiento: string, fecha: string = new Date().toISOString().slice(0, 10)): number {
  const [an, mn, dn] = nacimiento.split("-").map(Number);
  const [af, mf, df] = fecha.split("-").map(Number);
  return af - an - (mf < mn || (mf === mn && df < dn) ? 1 : 0);
}
