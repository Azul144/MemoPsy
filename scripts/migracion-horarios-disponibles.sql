-- RF 4.3 - Horarios que cada psicólogo habilita para que sus pacientes reprogramen turnos.
-- Cada fila es una franja semanal (por ejemplo: martes de 14:00 a 18:00).
-- Es seguro ejecutarlo más de una vez.
CREATE TABLE IF NOT EXISTS horario_disponible (
  id INT NOT NULL AUTO_INCREMENT,
  psicologo_id INT NOT NULL,
  -- 1 = lunes ... 5 = viernes (el consultorio atiende de lunes a viernes)
  dia_semana TINYINT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_horario_psicologo (psicologo_id, dia_semana),
  CONSTRAINT horario_disponible_ibfk_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo (id) ON DELETE CASCADE
) ENGINE = InnoDB;
