-- Generado por scripts/generar-esquema-docker.mjs. No editar a mano.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `accion` (`id`, `nombre`) VALUES
(3, 'Editar'),
(5, 'Registrar'),
(11, 'Ver'),
(590, 'Eliminar'),
(13140280, 'Asignar');

INSERT INTO `estado` (`id`, `nombre`) VALUES
(4, 'Pendiente'),
(5, 'Cancelada'),
(6, 'Finalizada'),
(7, 'Confirmada'),
(8, 'Reprogramada');

INSERT INTO `medio_de_pago` (`id`, `descripcion`) VALUES
(1, 'Efectivo'),
(2, 'QR del psicólogo'),
(3, 'Obra social');

INSERT INTO `modalidad` (`id`, `nombre`) VALUES
(3, 'Presencial'),
(4, 'Remota');

INSERT INTO `modulo` (`id`, `nombre`) VALUES
(3, 'Informes'),
(5, 'Usuarios'),
(10, 'Perfiles'),
(17, 'Sesiones'),
(79, 'Auditoría');

INSERT INTO `obra_social` (`id`, `nombre`, `activo`) VALUES
(1, 'IASEP', 1),
(2, 'OSJERA', 1),
(3, 'Particular', 1),
(4, 'PAMI', 1),
(5, 'IOSFA', 1),
(6, 'Incluir Salud (ex PROFE)', 1),
(7, 'OSECAC', 1),
(8, 'OSPRERA', 1),
(9, 'OSPECON (UOCRA)', 1),
(10, 'OSPLAD', 1),
(11, 'OSPJN (Poder Judicial de la Nación)', 1),
(12, 'OSPE', 1),
(13, 'OSFATLYF (Luz y Fuerza)', 1),
(14, 'OSUOMRA', 1),
(15, 'OSDE', 1),
(16, 'Swiss Medical', 1),
(17, 'Galeno', 1),
(18, 'Medifé', 1),
(19, 'Sancor Salud', 1),
(20, 'Prevención Salud', 1),
(21, 'Federada Salud', 1),
(22, 'Jerárquicos Salud', 1);

INSERT INTO `perfil` (`id`, `nombre`, `descripcion`) VALUES
(8, 'Administrador', 'Administrador con todos los permisos'),
(9, 'Psicólogo', 'Informes y Sesiones propias'),
(12, 'Paciente', 'Puede visualizar informes de recordatorios proporcionados por sus psicólogos, así como visualizar sus sesiones programadas.'),
(13, 'Recepcionista', 'Puede visualizar las sesiones, editarlas y asignarlas a Psicólogos y Pacientes.'),
(15, 'Supervisor', 'supervisa psicologos'),
(16, 'Auditor', 'Consulta el registro de auditoría en modo solo lectura');

INSERT INTO `permiso` (`id`, `nombre`, `descripcion`, `modulo_id`, `accion_id`) VALUES
(3, 'Ver Informes', 'Ver la lista de informes de pacientes', 3, 11),
(5, 'Editar Perfil', 'Editar un perfil', 10, 3),
(6, 'Asignar Perfil', 'Asignar un perfil a un Usuario', 10, 13140280),
(7, 'Ver Perfiles', 'Ver la lista de perfiles', 10, 11),
(11, 'Editar Sesión', 'Editar una sesión programada', 17, 3),
(20, 'Eliminar Perfil', 'Eliminar un perfil', 10, 590),
(37, 'Registrar Usuario', 'Registrar un nuevo usuario', 5, 5),
(49, 'Registrar Sesión', 'Registrar una nueva sesión con un paciente', 17, 5),
(784, 'Editar Usuario', 'Editar los datos de un usuario', 5, 3),
(7723, 'Ver Usuarios', 'Ver la lista de usuarios', 5, 11),
(13483, 'Registrar Informe', 'Registrar un nuevo informe de paciente', 3, 5),
(93330, 'Eliminar Sesión', 'Eliminar una sesión programada', 17, 590),
(773410, 'Registrar Perfil', 'Registrar un nuevo perfil', 10, 5),
(773411, 'Eliminar Usuario', 'Eliminar un usuario', 5, 590),
(773412, 'Editar Informe', 'Editar un informe de paciente', 3, 3),
(773413, 'Eliminar Informe', 'Eliminar un informe de paciente', 3, 590),
(773414, 'Ver Sesiones', 'Ver la lista de sesiones programadas', 17, 11),
(773415, 'Asignar Profesional', 'Asignar un profesional a una sesión', 17, 13140280),
(773416, 'Registrar Pago', 'Ver y registrar el estado de pago de las sesiones', 17, 5),
(773417, 'Ver Auditoría', 'Consultar el registro de accesos y modificaciones (solo lectura)', 79, 11);

INSERT INTO `perfil_tiene_permiso` (`perfil_id`, `permiso_id`) VALUES
(9, 3),
(12, 3),
(15, 3),
(8, 5),
(8, 6),
(15, 6),
(8, 7),
(16, 7),
(9, 11),
(13, 11),
(15, 11),
(8, 20),
(8, 37),
(9, 49),
(13, 49),
(8, 784),
(8, 7723),
(16, 7723),
(9, 13483),
(13, 93330),
(8, 773410),
(8, 773411),
(9, 773412),
(9, 773413),
(9, 773414),
(12, 773414),
(13, 773414),
(16, 773414),
(13, 773415),
(9, 773416),
(13, 773416),
(8, 773417),
(16, 773417);


SET FOREIGN_KEY_CHECKS = 1;
