-- RF 1.4 - Registro de auditoría de accesos y modificaciones (RNF02, Ley 25.326).
-- Es seguro ejecutarlo más de una vez.

-- 1) Tabla de eventos. Se guarda el email además del id para que el registro
--    siga siendo legible aunque el usuario se elimine después (sin FK a propósito).
--    El sistema solo INSERTA en esta tabla: no hay pantallas ni APIs para editar o borrar.
--    En "detalle" nunca se guarda contenido clínico, solo qué se hizo y sobre qué id.
CREATE TABLE IF NOT EXISTS auditoria (
  id INT NOT NULL AUTO_INCREMENT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  email VARCHAR(255) NULL,
  accion VARCHAR(40) NOT NULL,
  modulo VARCHAR(40) NOT NULL,
  entidad_id VARCHAR(50) NULL,
  detalle VARCHAR(500) NULL,
  ip VARCHAR(45) NULL,
  PRIMARY KEY (id),
  KEY idx_auditoria_fecha (fecha),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_modulo (modulo),
  KEY idx_auditoria_accion (accion)
);

-- 2) Módulo y permiso para consultar el registro
INSERT INTO modulo (nombre)
SELECT 'Auditoría' WHERE NOT EXISTS (SELECT 1 FROM modulo WHERE nombre = 'Auditoría');

INSERT INTO permiso (nombre, descripcion, modulo_id, accion_id)
SELECT 'Ver Auditoría', 'Consultar el registro de accesos y modificaciones (solo lectura)', m.id, a.id
FROM modulo m JOIN accion a ON a.nombre = 'Ver'
WHERE m.nombre = 'Auditoría'
  AND NOT EXISTS (SELECT 1 FROM permiso WHERE nombre = 'Ver Auditoría');

-- 3) Lo pueden ver el Auditor (su función principal) y el Administrador
INSERT INTO perfil_tiene_permiso (perfil_id, permiso_id)
SELECT pf.id, pm.id
FROM perfil pf
JOIN permiso pm ON pm.nombre = 'Ver Auditoría'
WHERE pf.nombre IN ('Auditor', 'Administrador')
  AND NOT EXISTS (
    SELECT 1 FROM perfil_tiene_permiso x WHERE x.perfil_id = pf.id AND x.permiso_id = pm.id
  );
