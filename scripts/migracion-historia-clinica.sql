-- Historia clínica del paciente (Ley 26.529, arts. 12 a 15).
-- Una por paciente y psicólogo tratante: la admisión (datos, motivo, antecedentes, examen,
-- diagnóstico presuntivo, plan y consentimiento) y el cierre. La evolución no se guarda acá:
-- son las notas clínicas del mismo psicólogo y paciente, en orden cronológico.
-- Los textos se guardan cifrados por el sistema (AES-256-GCM), por eso son todos TEXT.
-- Es seguro ejecutarlo más de una vez.

CREATE TABLE IF NOT EXISTS historia_clinica (
  id INT NOT NULL AUTO_INCREMENT,
  paciente_id INT NOT NULL,
  psicologo_id INT NOT NULL,
  fecha_admision DATE NOT NULL,
  -- Datos de identificación que no están en la ficha del paciente
  estado_civil TEXT NULL,
  ocupacion TEXT NULL,
  escolaridad TEXT NULL,
  convivencia TEXT NULL,
  contacto_emergencia TEXT NULL,
  derivado_por TEXT NULL,
  -- Admisión
  motivo_consulta TEXT NULL,
  historia_problema TEXT NULL,
  antecedentes_personales TEXT NULL,
  antecedentes_familiares TEXT NULL,
  examen_mental TEXT NULL,
  evaluaciones TEXT NULL,
  impresion_diagnostica TEXT NULL,
  plan_tratamiento TEXT NULL,
  consentimiento_informado TINYINT NOT NULL DEFAULT 0,
  fecha_consentimiento DATE NULL,
  -- Cierre: ALTA, ABANDONO, DERIVACION u OTRO
  fecha_cierre DATE NULL,
  motivo_cierre VARCHAR(20) NULL,
  epicrisis TEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_historia_paciente_psicologo (paciente_id, psicologo_id),
  CONSTRAINT historia_clinica_ibfk_paciente FOREIGN KEY (paciente_id) REFERENCES paciente (id),
  CONSTRAINT historia_clinica_ibfk_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo (id)
);
