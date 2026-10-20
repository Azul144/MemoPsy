-- Alinea la base con el modelo de datos del TIF (apartado 8.6).
-- Ejecutar una sola vez sobre psicologia_db, después de migracion-pagos-sesion.sql.

-- 1) Tablas fuera del alcance del TIF (facturación y domicilios): estaban vacías y sin uso.
--    El TIF excluye la facturación electrónica (8.2.3).
DROP TABLE IF EXISTS persona_tiene_factura;
DROP TABLE IF EXISTS detalle_factura;
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS tipo_factura;
DROP TABLE IF EXISTS domicilio;
DROP TABLE IF EXISTS ciudad;
DROP TABLE IF EXISTS pais;
DROP TABLE IF EXISTS telefono;

-- 2) Informe: etiquetas para categorizar y buscar (RF 2.1)
ALTER TABLE informe
  ADD COLUMN etiquetas VARCHAR(255) NULL AFTER contenido;

-- 3) Sesión: enlace de Google Meet para sesiones remotas (RF 3.4)
ALTER TABLE sesion
  ADD COLUMN enlace_videollamada VARCHAR(255) NULL AFTER estado_id;

-- 4) Estados del turno que pide el TIF (confirmado / reprogramado), además de los existentes
INSERT INTO estado (nombre)
SELECT t.nombre FROM (SELECT 'Confirmada' AS nombre UNION ALL SELECT 'Reprogramada') AS t
WHERE NOT EXISTS (SELECT 1 FROM estado e WHERE e.nombre = t.nombre);
