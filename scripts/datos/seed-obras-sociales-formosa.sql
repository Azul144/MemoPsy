-- Obras sociales con cobertura en la Provincia de Formosa + opción "Particular".
-- Es seguro ejecutarlo varias veces: solo inserta las que no existen todavía.

INSERT INTO obra_social (nombre, activo)
SELECT t.nombre, 1
FROM (
  SELECT 'Particular' AS nombre
  UNION ALL SELECT 'IASEP'
  UNION ALL SELECT 'OSJERA'
  UNION ALL SELECT 'PAMI'
  UNION ALL SELECT 'IOSFA'
  UNION ALL SELECT 'Incluir Salud (ex PROFE)'
  UNION ALL SELECT 'OSECAC'
  UNION ALL SELECT 'OSPRERA'
  UNION ALL SELECT 'OSPECON (UOCRA)'
  UNION ALL SELECT 'OSPLAD'
  UNION ALL SELECT 'OSPJN (Poder Judicial de la Nación)'
  UNION ALL SELECT 'OSPE'
  UNION ALL SELECT 'OSFATLYF (Luz y Fuerza)'
  UNION ALL SELECT 'OSUOMRA'
  UNION ALL SELECT 'OSDE'
  UNION ALL SELECT 'Swiss Medical'
  UNION ALL SELECT 'Galeno'
  UNION ALL SELECT 'Medifé'
  UNION ALL SELECT 'Sancor Salud'
  UNION ALL SELECT 'Prevención Salud'
  UNION ALL SELECT 'Federada Salud'
  UNION ALL SELECT 'Jerárquicos Salud'
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM obra_social o WHERE o.nombre = t.nombre
);
