-- RF 2.4 - Informe de seguimiento para el paciente.
-- Se genera a partir de una nota clínica, pero es un documento aparte: la nota (historia clínica)
-- queda siempre privada del psicólogo y el paciente solo ve este informe, en lenguaje accesible,
-- con las actividades y pautas acordadas en sesión.
-- Es seguro ejecutarlo más de una vez.

-- 1) Un informe de seguimiento por nota clínica
CREATE TABLE IF NOT EXISTS informe_seguimiento (
  id INT NOT NULL AUTO_INCREMENT,
  informe_id INT NOT NULL,
  -- Lo que se trabajó en la sesión, contado en lenguaje simple
  resumen TEXT NOT NULL,
  pautas TEXT NULL,
  -- Devolución positiva del psicólogo: avances y logros
  avances TEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seguimiento_informe (informe_id),
  CONSTRAINT informe_seguimiento_ibfk_informe FOREIGN KEY (informe_id) REFERENCES informe (id) ON DELETE CASCADE
);

-- 2) Actividades para hacer hasta la próxima sesión, con la respuesta del paciente
CREATE TABLE IF NOT EXISTS actividad_seguimiento (
  id INT NOT NULL AUTO_INCREMENT,
  seguimiento_id INT NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  -- NULL = sin responder, HECHA, NO_PUDE
  respuesta VARCHAR(20) NULL,
  comentario VARCHAR(500) NULL,
  fecha_respuesta DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_actividad_seguimiento (seguimiento_id, orden),
  CONSTRAINT actividad_seguimiento_ibfk_seguimiento FOREIGN KEY (seguimiento_id) REFERENCES informe_seguimiento (id) ON DELETE CASCADE
);

-- 3) La nota clínica es siempre privada: lo que se comparte con el paciente va en el informe de seguimiento
UPDATE informe SET es_privado = 1 WHERE es_privado = 0 OR es_privado IS NULL;
