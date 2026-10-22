-- RF 3.3 - Recordatorios de turno por email (y más adelante por WhatsApp).
-- Registra a quién ya se le mandó el recordatorio de cada turno y por qué canal,
-- para que nadie lo reciba dos veces. Si el turno se reprograma, se borran sus filas
-- y el recordatorio se vuelve a mandar con el horario nuevo.
-- Es seguro ejecutarlo más de una vez.

CREATE TABLE IF NOT EXISTS recordatorio_enviado (
  sesion_id INT NOT NULL,
  usuario_id INT NOT NULL,
  -- EMAIL, WHATSAPP
  canal VARCHAR(20) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sesion_id, usuario_id, canal),
  CONSTRAINT recordatorio_enviado_ibfk_sesion FOREIGN KEY (sesion_id) REFERENCES sesion (id) ON DELETE CASCADE,
  CONSTRAINT recordatorio_enviado_ibfk_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);
