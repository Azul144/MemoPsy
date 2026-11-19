// src/lib/obras-sociales-psicologo.ts
// RF 1.1 - Obras sociales con las que trabaja cada psicólogo (tabla psicologo_obra_social).
// El administrador las marca al registrar o editar al psicólogo.
import type { EntityManager } from "typeorm"
import { getDataSource } from "@/lib/database"

export interface ObraSocialResumen {
  id: string
  nombre: string
}

type Consulta = Pick<EntityManager, "query">

// Devuelve, para cada psicólogo pedido, la lista de obras sociales ordenada por nombre
export async function obrasSocialesDePsicologos(
  idsPsicologo: (string | number)[],
  db?: Consulta,
): Promise<Map<string, ObraSocialResumen[]>> {
  const resultado = new Map<string, ObraSocialResumen[]>()
  if (idsPsicologo.length === 0) return resultado
  const conexion = db ?? (await getDataSource())
  const filas: { id_psicologo: number; id_obra_social: number; nombre: string }[] = await conexion.query(
    `SELECT pos.id_psicologo, os.id_obra_social, os.nombre
       FROM psicologo_obra_social pos
       JOIN obra_social os ON os.id_obra_social = pos.id_obra_social
      WHERE pos.id_psicologo IN (?)
      ORDER BY os.nombre`,
    [idsPsicologo.map(Number)],
  )
  for (const f of filas) {
    const clave = String(f.id_psicologo)
    const lista = resultado.get(clave) ?? []
    lista.push({ id: String(f.id_obra_social), nombre: f.nombre })
    resultado.set(clave, lista)
  }
  return resultado
}

// Normaliza lo que manda el formulario: ids numéricos, sin repetidos
export function limpiarIdsObrasSociales(valor: unknown): number[] {
  if (!Array.isArray(valor)) return []
  return [...new Set(valor.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
}

// Reemplaza las obras sociales del psicólogo por las elegidas, dentro de la transacción del alta o la edición.
// Devuelve false si alguna no existe o está dada de baja (y no guarda nada).
export async function guardarObrasSocialesDePsicologo(
  manager: Consulta,
  idPsicologo: string | number,
  idsObraSocial: number[],
): Promise<boolean> {
  if (idsObraSocial.length > 0) {
    const validas: { total: number }[] = await manager.query(
      "SELECT COUNT(*) AS total FROM obra_social WHERE activo = 1 AND id_obra_social IN (?)",
      [idsObraSocial],
    )
    if (Number(validas[0]?.total) !== idsObraSocial.length) return false
  }
  await manager.query("DELETE FROM psicologo_obra_social WHERE id_psicologo = ?", [Number(idPsicologo)])
  if (idsObraSocial.length > 0) {
    await manager.query("INSERT INTO psicologo_obra_social (id_psicologo, id_obra_social) VALUES ?", [
      idsObraSocial.map((id) => [Number(idPsicologo), id]),
    ])
  }
  return true
}
