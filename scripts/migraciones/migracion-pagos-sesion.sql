-- RF 3.5 - Registro de estado de pago por sesión.
-- Ejecutar una sola vez sobre psicologia_db.

-- Medios de pago del consultorio
INSERT INTO medio_de_pago (descripcion)
SELECT t.descripcion FROM (
  SELECT 'Efectivo' AS descripcion
  UNION ALL SELECT 'QR del psicólogo'
  UNION ALL SELECT 'Obra social'
) AS t
WHERE NOT EXISTS (SELECT 1 FROM medio_de_pago m WHERE m.descripcion = t.descripcion);

-- Datos de pago de cada sesión
ALTER TABLE sesion
  ADD COLUMN estado_pago VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN medio_de_pago_id INT NULL,
  ADD COLUMN monto DECIMAL(10,2) NULL,
  ADD COLUMN fecha_pago DATETIME NULL,
  ADD KEY medio_de_pago_id (medio_de_pago_id),
  ADD CONSTRAINT sesion_ibfk_medio_pago FOREIGN KEY (medio_de_pago_id) REFERENCES medio_de_pago (id);

-- Permiso para ver y registrar pagos (módulo Sesiones, acción Registrar)
INSERT INTO permiso (nombre, descripcion, modulo_id, accion_id)
SELECT 'Registrar Pago', 'Ver y registrar el estado de pago de las sesiones', 17, 5
WHERE NOT EXISTS (SELECT 1 FROM permiso WHERE nombre = 'Registrar Pago');

-- Se asigna a Psicólogo (sus propias sesiones) y Recepcionista (todas)
INSERT INTO perfil_tiene_permiso (perfil_id, permiso_id)
SELECT pf.id, pm.id
FROM perfil pf
JOIN permiso pm ON pm.nombre = 'Registrar Pago'
WHERE pf.nombre IN ('Psicólogo', 'Recepcionista')
  AND NOT EXISTS (
    SELECT 1 FROM perfil_tiene_permiso x WHERE x.perfil_id = pf.id AND x.permiso_id = pm.id
  );
