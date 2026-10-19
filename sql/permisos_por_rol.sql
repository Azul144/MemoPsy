-- =====================================================================
-- MemoPsy — Permisos por rol (RF 4.1 y RF 4.2 del TIF)
-- ANTES DE CORRERLO: hacé un backup (phpMyAdmin → psicologia_db → Exportar)
-- =====================================================================
USE psicologia_db;

-- 1) Borra los permisos actuales de los 5 roles del TIF
DELETE ptp
FROM perfil_tiene_permiso ptp
JOIN perfil pf ON pf.id = ptp.perfil_id
WHERE pf.nombre IN ('Administrador', 'Psicólogo', 'Paciente', 'Recepcionista', 'Auditor');

-- 2) Carga los permisos que le corresponden a cada rol
INSERT INTO perfil_tiene_permiso (perfil_id, permiso_id)
SELECT pf.id, pm.id
FROM perfil pf
JOIN permiso pm ON (
  -- Administrador: cuentas de usuario y perfiles. NO ve informes clínicos ni la agenda.
  (pf.nombre = 'Administrador' AND pm.nombre IN (
     'Ver Usuarios', 'Registrar Usuario', 'Editar Usuario', 'Eliminar Usuario',
     'Ver Perfiles', 'Registrar Perfil', 'Editar Perfil', 'Eliminar Perfil', 'Asignar Perfil'))
  -- Psicólogo: sus sesiones y sus informes clínicos
  OR (pf.nombre = 'Psicólogo' AND pm.nombre IN (
     'Ver Sesiones', 'Registrar Sesión', 'Editar Sesión',
     'Ver Informes', 'Registrar Informe', 'Editar Informe', 'Eliminar Informe'))
  -- Recepcionista: toda la agenda (turnos, pagos, asignar profesional). Sin información clínica.
  OR (pf.nombre = 'Recepcionista' AND pm.nombre IN (
     'Ver Sesiones', 'Registrar Sesión', 'Editar Sesión', 'Eliminar Sesión', 'Asignar Profesional'))
  -- Auditor: solo lectura (usuarios, perfiles y agenda). Sin informes clínicos.
  OR (pf.nombre = 'Auditor' AND pm.nombre IN (
     'Ver Usuarios', 'Ver Perfiles', 'Ver Sesiones'))
  -- Paciente: solo sus turnos y el material que su psicólogo le comparte
  OR (pf.nombre = 'Paciente' AND pm.nombre IN (
     'Ver Sesiones', 'Ver Informes'))
);

-- 3) Verificación: cuántos permisos quedó teniendo cada rol
--    Esperado: Administrador 9 · Psicólogo 7 · Recepcionista 5 · Auditor 3 · Paciente 2
SELECT pf.nombre AS rol,
       COUNT(pm.id) AS cantidad,
       GROUP_CONCAT(pm.nombre ORDER BY pm.nombre SEPARATOR ', ') AS permisos
FROM perfil pf
LEFT JOIN perfil_tiene_permiso ptp ON ptp.perfil_id = pf.id
LEFT JOIN permiso pm ON pm.id = ptp.permiso_id
WHERE pf.nombre IN ('Administrador', 'Psicólogo', 'Paciente', 'Recepcionista', 'Auditor')
GROUP BY pf.id, pf.nombre
ORDER BY pf.nombre;
