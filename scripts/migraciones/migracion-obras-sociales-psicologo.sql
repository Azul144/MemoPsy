-- RF 1.1 - Obras sociales con las que trabaja cada psicólogo.
-- Al registrar o editar un psicólogo, el administrador marca una o varias obras sociales
-- (por ejemplo IASEP, PAMI o Particular). Si se borra la ficha del psicólogo, se borran sus filas.
-- Es seguro ejecutarlo más de una vez.

CREATE TABLE IF NOT EXISTS psicologo_obra_social (
  id_psicologo INT NOT NULL,
  id_obra_social INT NOT NULL,
  PRIMARY KEY (id_psicologo, id_obra_social),
  KEY fk_psicologo_obra_social_obra (id_obra_social),
  CONSTRAINT fk_psicologo_obra_social_psicologo FOREIGN KEY (id_psicologo) REFERENCES psicologo (id_psicologo) ON DELETE CASCADE,
  CONSTRAINT fk_psicologo_obra_social_obra FOREIGN KEY (id_obra_social) REFERENCES obra_social (id_obra_social)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
