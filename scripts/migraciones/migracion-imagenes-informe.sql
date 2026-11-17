-- Imágenes adjuntas a la nota clínica: dibujos de técnicas proyectivas (por ejemplo, la persona
-- bajo la lluvia), fotos de producciones del paciente o material que le sirva en el tratamiento.
-- La imagen se guarda en la base y cifrada por el sistema (AES-256-GCM): no queda ningún archivo
-- en el servidor. Por defecto es privada del psicólogo; si se marca "compartida", el paciente la ve
-- en su informe de seguimiento.
-- Es seguro ejecutarlo más de una vez.

CREATE TABLE IF NOT EXISTS informe_imagen (
  id_informe_imagen INT NOT NULL AUTO_INCREMENT,
  id_informe INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(50) NOT NULL,
  -- Descripción u observaciones del psicólogo (cifrada)
  descripcion TEXT NULL,
  -- Contenido de la imagen, cifrado
  datos LONGBLOB NOT NULL,
  compartida TINYINT(1) NOT NULL DEFAULT 0,
  orden INT NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_informe_imagen),
  KEY idx_informe_imagen (id_informe, orden),
  CONSTRAINT informe_imagen_ibfk_informe FOREIGN KEY (id_informe) REFERENCES informe (id_informe) ON DELETE CASCADE
) ENGINE = InnoDB;
