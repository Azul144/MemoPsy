-- RF 1.3 - Foto de perfil de cada usuario (psicólogo, paciente, recepción, administración y auditoría).
-- Es opcional: sin foto, el sistema muestra las iniciales. El navegador la recorta cuadrada y la
-- achica antes de subirla; se guarda cifrada (AES-256-GCM) en la base, no como archivo en el servidor.
-- foto_actualizada sirve para que el navegador pida la versión nueva cuando cambia.
-- Es seguro ejecutarlo más de una vez.

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persona' AND COLUMN_NAME = 'foto');
SET @sql := IF(@existe = 0, 'ALTER TABLE persona ADD COLUMN foto MEDIUMBLOB NULL AFTER telefono', 'SELECT 1');
PREPARE agregar FROM @sql;
EXECUTE agregar;
DEALLOCATE PREPARE agregar;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persona' AND COLUMN_NAME = 'foto_actualizada');
SET @sql := IF(@existe = 0, 'ALTER TABLE persona ADD COLUMN foto_actualizada DATETIME NULL AFTER foto', 'SELECT 1');
PREPARE agregar FROM @sql;
EXECUTE agregar;
DEALLOCATE PREPARE agregar;
