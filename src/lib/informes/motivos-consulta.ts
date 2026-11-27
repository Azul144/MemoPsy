// src/lib/informes/motivos-consulta.ts
// Motivos de consulta más frecuentes en la práctica psicológica. Al registrar una nota clínica
// el psicólogo marca con qué vino el paciente: arma el título y se suma a las etiquetas,
// así después se pueden buscar las notas por motivo.
// Para agregar o cambiar un motivo, se edita solo esta lista (los primeros se ven sin desplegar).

export const MOTIVOS_CONSULTA = [
  "Ansiedad",
  "Estrés",
  "Depresión",
  "Ataques de pánico",
  "Duelo",
  "Problemas de pareja",
  "Conflictos familiares",
  "Baja autoestima",
  "Insomnio",
  "Burnout (desgaste laboral)",
  "Fobias",
  "TOC",
  "Estrés postraumático",
  "Trastornos de la conducta alimentaria",
  "Consumo problemático de sustancias",
  "Riesgo suicida o autolesiones",
  "Violencia de género",
  "Crisis vital o cambios",
  "TDAH",
  "Problemas de conducta (niños y adolescentes)",
  "Dificultades de aprendizaje",
  "Trastorno bipolar",
] as const;

// Cuántos se muestran antes de "Ver más"
export const MOTIVOS_VISIBLES = 10;

// "Ansiedad · Estrés"
export const tituloDeMotivos = (motivos: string[]) => motivos.join(" · ");

// Etiquetas separadas por comas, sin repetir (sin distinguir mayúsculas)
export function etiquetasConMotivos(etiquetas: string, agregar: string[], quitar: string[]): string {
  const lista = etiquetas.split(",").map((e) => e.trim()).filter(Boolean);
  const fuera = new Set(quitar.map((m) => m.toLowerCase()));
  const resultado = lista.filter((e) => !fuera.has(e.toLowerCase()));
  for (const m of agregar) {
    if (!resultado.some((e) => e.toLowerCase() === m.toLowerCase())) resultado.push(m.toLowerCase());
  }
  return resultado.join(", ");
}
