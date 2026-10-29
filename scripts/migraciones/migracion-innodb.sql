-- Pasa a InnoDB las tablas que se crearon con MyISAM y les agrega sus claves foráneas.
-- WampServer trae MyISAM como motor por defecto: las migraciones de esas tablas no decían
-- ENGINE=InnoDB, así que se crearon sin claves foráneas (MyISAM las ignora sin avisar).
-- Las claves son las del diccionario de datos (apartado 8.6.1 del TIF). AUDITORIA queda sin
-- clave foránea a propósito, pero también pasa a InnoDB.
-- Ejecutar una sola vez: si las claves ya existen, MySQL avisa que el nombre está repetido.

ALTER TABLE auditoria ENGINE = InnoDB;
ALTER TABLE horario_disponible ENGINE = InnoDB;
ALTER TABLE informe_seguimiento ENGINE = InnoDB;
ALTER TABLE actividad_seguimiento ENGINE = InnoDB;
ALTER TABLE notificacion ENGINE = InnoDB;
ALTER TABLE recordatorio_enviado ENGINE = InnoDB;
ALTER TABLE historia_clinica ENGINE = InnoDB;

ALTER TABLE horario_disponible
  ADD CONSTRAINT horario_disponible_ibfk_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo (id) ON DELETE CASCADE;

ALTER TABLE informe_seguimiento
  ADD CONSTRAINT informe_seguimiento_ibfk_informe FOREIGN KEY (informe_id) REFERENCES informe (id) ON DELETE CASCADE;

ALTER TABLE actividad_seguimiento
  ADD CONSTRAINT actividad_seguimiento_ibfk_seguimiento FOREIGN KEY (seguimiento_id) REFERENCES informe_seguimiento (id) ON DELETE CASCADE;

ALTER TABLE notificacion
  ADD CONSTRAINT notificacion_ibfk_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  ADD CONSTRAINT notificacion_ibfk_sesion FOREIGN KEY (sesion_id) REFERENCES sesion (id) ON DELETE CASCADE;

ALTER TABLE recordatorio_enviado
  ADD CONSTRAINT recordatorio_enviado_ibfk_sesion FOREIGN KEY (sesion_id) REFERENCES sesion (id) ON DELETE CASCADE,
  ADD CONSTRAINT recordatorio_enviado_ibfk_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE;

ALTER TABLE historia_clinica
  ADD CONSTRAINT historia_clinica_ibfk_paciente FOREIGN KEY (paciente_id) REFERENCES paciente (id),
  ADD CONSTRAINT historia_clinica_ibfk_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo (id);
