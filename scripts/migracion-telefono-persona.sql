-- RF 3.3 - Celular de la persona, para mandar el recordatorio de turno por WhatsApp.
-- Es opcional: si queda vacío, el paciente recibe solo el email y el aviso interno.
-- Se guarda en formato internacional sin "+" (por ejemplo 5493704123456).
-- Es seguro ejecutarlo más de una vez.

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persona' AND COLUMN_NAME = 'telefono');
SET @sql := IF(@existe = 0, 'ALTER TABLE persona ADD COLUMN telefono VARCHAR(20) NULL AFTER fecha_nacimiento', 'SELECT 1');
PREPARE agregar FROM @sql;
EXECUTE agregar;
DEALLOCATE PREPARE agregar;
