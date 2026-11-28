-- RF 3.1 - Lugares que cada psicólogo quiere dejar libres por semana (para pacientes nuevos, urgencias
-- o una sesión extra), aparte de los horarios pactados. Si al pactar un horario nuevo se queda sin ese
-- margen, MemoPsy le avisa antes de guardar. Por defecto, 5 por semana (uno por día).
-- Es seguro ejecutarlo más de una vez.

SET @hay := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'psicologo' AND COLUMN_NAME = 'lugares_reservados');
SET @sql := IF(@hay = 0,
  'ALTER TABLE psicologo ADD COLUMN lugares_reservados TINYINT NOT NULL DEFAULT 5',
  'SELECT 1');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
