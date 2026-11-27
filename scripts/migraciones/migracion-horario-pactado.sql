-- RF 3.1 - Horario pactado entre el psicólogo y cada paciente (el encuadre del tratamiento).
-- Cada paciente tiene 1 o 2 horarios fijos por semana con su psicólogo (día y hora), en días distintos.
-- MemoPsy crea solos los turnos de las próximas semanas a partir de estos horarios.
-- En la sesión se guarda de qué horario pactado salió y para qué fecha, así un turno que se canceló
-- o se reprogramó no se vuelve a crear.
-- Es seguro ejecutarlo más de una vez.

CREATE TABLE IF NOT EXISTS horario_pactado (
  id_horario_pactado INT NOT NULL AUTO_INCREMENT,
  id_psicologo INT NOT NULL,
  id_paciente INT NOT NULL,
  dia_semana TINYINT NOT NULL,          -- 1 = lunes ... 5 = viernes
  hora_inicio TIME NOT NULL,
  id_modalidad INT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_horario_pactado),
  KEY idx_pactado_psicologo (id_psicologo, dia_semana, activo),
  KEY idx_pactado_paciente (id_paciente, activo),
  CONSTRAINT fk_pactado_psicologo FOREIGN KEY (id_psicologo) REFERENCES psicologo (id_psicologo) ON DELETE CASCADE,
  CONSTRAINT fk_pactado_paciente FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE CASCADE,
  CONSTRAINT fk_pactado_modalidad FOREIGN KEY (id_modalidad) REFERENCES modalidad (id_modalidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- sesion.id_horario_pactado y sesion.fecha_pactada (solo si todavía no existen)
SET @hay := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sesion' AND COLUMN_NAME = 'id_horario_pactado');
SET @sql := IF(@hay = 0,
  'ALTER TABLE sesion
     ADD COLUMN id_horario_pactado INT NULL,
     ADD COLUMN fecha_pactada DATE NULL,
     ADD UNIQUE KEY uq_sesion_pactada (id_horario_pactado, fecha_pactada),
     ADD CONSTRAINT fk_sesion_pactado FOREIGN KEY (id_horario_pactado) REFERENCES horario_pactado (id_horario_pactado) ON DELETE SET NULL',
  'SELECT 1');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
