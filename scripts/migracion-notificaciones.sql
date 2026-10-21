-- RF 3.2 y RF 3.3 - Notificaciones dentro de la plataforma.
-- Avisos a psicólogo y pacientes cuando un turno se reprograma o se cancela,
-- y recordatorio de los turnos de las próximas 24 horas.
-- Es seguro ejecutarlo más de una vez.

-- Cada fila es un aviso para UN usuario. En el texto nunca va contenido clínico:
-- solo fecha, hora y con quién es el turno.
CREATE TABLE IF NOT EXISTS notificacion (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  sesion_id INT NULL,
  -- REPROGRAMACION, CANCELACION, RECORDATORIO
  tipo VARCHAR(30) NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  leida TINYINT NOT NULL DEFAULT 0,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificacion_usuario (usuario_id, leida, fecha),
  KEY idx_notificacion_sesion (sesion_id, tipo),
  CONSTRAINT notificacion_ibfk_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT notificacion_ibfk_sesion FOREIGN KEY (sesion_id) REFERENCES sesion (id) ON DELETE CASCADE
);
