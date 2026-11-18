-- RF 3.3 - Recordatorios y chatbot de WhatsApp.
--  1) persona.whatsapp_acepta: cuándo aceptó la persona recibir mensajes por WhatsApp (Ley 25.326).
--     NULL = no aceptó o se dio de baja: no se le manda ningún recordatorio por WhatsApp.
--  2) whatsapp_conversacion: en qué paso de la charla con el chatbot está cada celular
--     (por ejemplo, eligiendo un horario para reprogramar). NO guarda el texto de los mensajes.
-- Es seguro ejecutarlo más de una vez.

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persona' AND COLUMN_NAME = 'whatsapp_acepta');
SET @sql := IF(@existe = 0, 'ALTER TABLE persona ADD COLUMN whatsapp_acepta DATETIME NULL AFTER telefono', 'SELECT 1');
PREPARE agregar FROM @sql;
EXECUTE agregar;
DEALLOCATE PREPARE agregar;

CREATE TABLE IF NOT EXISTS whatsapp_conversacion (
  telefono VARCHAR(20) NOT NULL,
  id_sesion INT NULL,
  paso VARCHAR(30) NOT NULL DEFAULT 'INICIO',
  opciones TEXT NULL,
  ultima_alerta DATETIME NULL,
  actualizada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (telefono),
  KEY fk_whatsapp_conversacion_sesion (id_sesion),
  CONSTRAINT fk_whatsapp_conversacion_sesion FOREIGN KEY (id_sesion) REFERENCES sesion (id_sesion) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
