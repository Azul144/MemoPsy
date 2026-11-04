// src/lib/database.ts
// Conexión a MySQL con TypeORM: lista de entidades y una sola conexión compartida por toda la aplicación.
import "reflect-metadata"
import { DataSource } from "typeorm"
import {
  BaseEntity,
  AccionEntity,
  ActividadSeguimientoEntity,
  AuditoriaEntity,
  EstadoEntity,
  HistoriaClinicaEntity,
  HorarioDisponibleEntity,
  InformeEntity,
  InformeSeguimientoEntity,
  MedioDePagoEntity,
  ModalidadEntity,
  ModuloEntity,
  NotificacionEntity,
  ObraSocialEntity,
  PacienteTieneInformeEntity,
  PacienteTieneSesionEntity,
  PacienteEntity,
  PerfilTienePermisoEntity,
  PerfilEntity,
  PermisoEntity,
  PersonaEntity,
  PsicologoEntity,
  SesionEntity,
  UsuarioTienePerfilEntity,
  UsuarioEntity,
} from "../entities"

// Configuración para la conexión a la base de datos
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
  // Base en la nube: certificado de la autoridad (CA) en base64. Sin la variable, conexión local sin SSL.
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
  synchronize: false,
  logging: true,
  //entities: [Persona, Permiso, Perfil, Usuario, Psicologo, Paciente, Recepcionista, Sesion, Informe, PerfilPermiso],
  entities: [
    BaseEntity,
    AccionEntity,
    ActividadSeguimientoEntity,
  AuditoriaEntity,
    EstadoEntity,
    HistoriaClinicaEntity,
    HorarioDisponibleEntity,
    InformeEntity,
    InformeSeguimientoEntity,
    MedioDePagoEntity,
    ModalidadEntity,
    ModuloEntity,
    NotificacionEntity,
    ObraSocialEntity,
    PacienteTieneInformeEntity,
    PacienteTieneSesionEntity,
    PacienteEntity,
    PerfilTienePermisoEntity,
    PerfilEntity,
    PermisoEntity,
    PersonaEntity,
    PsicologoEntity,
    SesionEntity,
    UsuarioTienePerfilEntity,
    UsuarioEntity,
  ],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: [],
})

// Hora de Argentina para NOW() y CURRENT_TIMESTAMP, igual que en la aplicación.
// Las bases en la nube suelen usar UTC y no siempre dejan cambiar la zona global.
const ZONA_HORARIA = "-03:00"

function usarZonaHoraria(dataSource: DataSource) {
  const pool = (dataSource.driver as any).pool
  const fijarZona = (conexion: any, listo?: (error: Error | null) => void) =>
    conexion.query("SET time_zone = ?", [ZONA_HORARIA], (error: Error | null) => listo?.(error))

  // Las conexiones que el pool abra de acá en adelante
  pool.on("connection", (conexion: any) => fijarZona(conexion))

  // La que TypeORM ya abrió al inicializar
  return new Promise<void>((resolve, reject) => {
    pool.getConnection((error: Error | null, conexion: any) => {
      if (error) return reject(error)
      fijarZona(conexion, (errorZona) => {
        conexion.release()
        if (errorZona) reject(errorZona)
        else resolve()
      })
    })
  })
}

// Singleton para mantener la conexión
let initialized = false

export async function initializeDatabase() {
  if (!initialized) {
    try {
      if (!AppDataSource.isInitialized) {
        console.log("Intentando inicializar la conexión a la base de datos...")
        await AppDataSource.initialize()
        await usarZonaHoraria(AppDataSource)
        console.log("¡Data Source ha sido inicializado correctamente!")
      }
      initialized = true
    } catch (error) {
      console.error("Error durante la inicialización del Data Source", error)
      throw error
    }
  }
  return AppDataSource
}

// Función para obtener un repositorio
export async function getRepository(entity: any) {
  const dataSource = await initializeDatabase()
  return dataSource.getRepository(entity)
}

// Función para obtener el DataSource directamente
export async function getDataSource() {
  return await initializeDatabase()
}
