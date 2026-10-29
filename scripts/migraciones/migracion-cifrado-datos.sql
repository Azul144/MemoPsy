-- RNF Seguridad - Cifrado en reposo de los datos clínicos (AES-256-GCM, desde la aplicación).
-- El texto cifrado ocupa más que el original, así que las columnas de las actividades pasan a TEXT.
-- Las notas (informe.contenido) y el seguimiento (resumen, pautas, avances) ya eran TEXT.
-- Después de correr esta migración, cifrar lo que ya estaba guardado con:
--   node --env-file=.env.local scripts/cifrar-datos-existentes.mjs
-- Es seguro ejecutarlo más de una vez.

ALTER TABLE actividad_seguimiento MODIFY descripcion TEXT NOT NULL;
ALTER TABLE actividad_seguimiento MODIFY comentario TEXT NULL;
