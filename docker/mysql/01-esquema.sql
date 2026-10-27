-- Generado por scripts/generar-esquema-docker.mjs. No editar a mano.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `accion` (
  `id_accion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `actividad_seguimiento` (
  `id_actividad_seguimiento` int NOT NULL AUTO_INCREMENT,
  `id_informe_seguimiento` int NOT NULL,
  `descripcion` text NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `respuesta` varchar(20) DEFAULT NULL,
  `comentario` text,
  `fecha_respuesta` datetime DEFAULT NULL,
  PRIMARY KEY (`id_actividad_seguimiento`),
  KEY `idx_actividad_seguimiento` (`id_informe_seguimiento`,`orden`),
  CONSTRAINT `actividad_seguimiento_ibfk_seguimiento` FOREIGN KEY (`id_informe_seguimiento`) REFERENCES `informe_seguimiento` (`id_informe_seguimiento`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auditoria` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `accion` varchar(40) NOT NULL,
  `modulo` varchar(40) NOT NULL,
  `id_entidad` varchar(50) DEFAULT NULL,
  `detalle` varchar(500) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_fecha` (`fecha`),
  KEY `idx_auditoria_usuario` (`id_usuario`),
  KEY `idx_auditoria_modulo` (`modulo`),
  KEY `idx_auditoria_accion` (`accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `estado` (
  `id_estado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `historia_clinica` (
  `id_historia_clinica` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `id_psicologo` int NOT NULL,
  `fecha_admision` date NOT NULL,
  `estado_civil` text,
  `ocupacion` text,
  `escolaridad` text,
  `convivencia` text,
  `contacto_emergencia` text,
  `derivado_por` text,
  `motivo_consulta` text,
  `historia_problema` text,
  `antecedentes_personales` text,
  `antecedentes_familiares` text,
  `examen_mental` text,
  `evaluaciones` text,
  `impresion_diagnostica` text,
  `plan_tratamiento` text,
  `consentimiento_informado` tinyint NOT NULL DEFAULT '0',
  `fecha_consentimiento` date DEFAULT NULL,
  `fecha_cierre` date DEFAULT NULL,
  `motivo_cierre` varchar(20) DEFAULT NULL,
  `epicrisis` text,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historia_clinica`),
  UNIQUE KEY `uq_historia_paciente_psicologo` (`id_paciente`,`id_psicologo`),
  KEY `historia_clinica_ibfk_psicologo` (`id_psicologo`),
  CONSTRAINT `historia_clinica_ibfk_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `historia_clinica_ibfk_psicologo` FOREIGN KEY (`id_psicologo`) REFERENCES `psicologo` (`id_psicologo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `horario_disponible` (
  `id_horario_disponible` int NOT NULL AUTO_INCREMENT,
  `id_psicologo` int NOT NULL,
  `dia_semana` tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_horario_disponible`),
  KEY `idx_horario_psicologo` (`id_psicologo`,`dia_semana`),
  CONSTRAINT `horario_disponible_ibfk_psicologo` FOREIGN KEY (`id_psicologo`) REFERENCES `psicologo` (`id_psicologo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `informe` (
  `id_informe` int NOT NULL AUTO_INCREMENT,
  `id_psicologo` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `contenido` text NOT NULL,
  `etiquetas` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL,
  `es_privado` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_informe`),
  KEY `psicologo_id` (`id_psicologo`),
  CONSTRAINT `informe_ibfk_1` FOREIGN KEY (`id_psicologo`) REFERENCES `psicologo` (`id_psicologo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `informe_seguimiento` (
  `id_informe_seguimiento` int NOT NULL AUTO_INCREMENT,
  `id_informe` int NOT NULL,
  `resumen` text NOT NULL,
  `pautas` text,
  `avances` text,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_informe_seguimiento`),
  UNIQUE KEY `uq_seguimiento_informe` (`id_informe`),
  CONSTRAINT `informe_seguimiento_ibfk_informe` FOREIGN KEY (`id_informe`) REFERENCES `informe` (`id_informe`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medio_de_pago` (
  `id_medio_de_pago` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  PRIMARY KEY (`id_medio_de_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modalidad` (
  `id_modalidad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_modalidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modulo` (
  `id_modulo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notificacion` (
  `id_notificacion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_sesion` int DEFAULT NULL,
  `tipo` varchar(30) NOT NULL,
  `titulo` varchar(120) NOT NULL,
  `mensaje` varchar(500) NOT NULL,
  `leida` tinyint NOT NULL DEFAULT '0',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notificacion_usuario` (`id_usuario`,`leida`,`fecha`),
  KEY `idx_notificacion_sesion` (`id_sesion`,`tipo`),
  CONSTRAINT `notificacion_ibfk_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `sesion` (`id_sesion`) ON DELETE CASCADE,
  CONSTRAINT `notificacion_ibfk_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `obra_social` (
  `id_obra_social` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_obra_social`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente` (
  `id_paciente` int NOT NULL AUTO_INCREMENT,
  `id_persona` int NOT NULL,
  `id_obra_social` int DEFAULT NULL,
  PRIMARY KEY (`id_paciente`),
  KEY `persona_id` (`id_persona`),
  KEY `obra_social_id` (`id_obra_social`),
  CONSTRAINT `paciente_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`),
  CONSTRAINT `paciente_ibfk_2` FOREIGN KEY (`id_obra_social`) REFERENCES `obra_social` (`id_obra_social`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente_tiene_informe` (
  `id_informe` int NOT NULL,
  `id_paciente` int NOT NULL,
  PRIMARY KEY (`id_informe`,`id_paciente`),
  KEY `fk_informe_has_paciente_paciente1_idx` (`id_paciente`),
  KEY `fk_informe_has_paciente_informe1_idx` (`id_informe`),
  CONSTRAINT `fk_informe_has_paciente_informe1` FOREIGN KEY (`id_informe`) REFERENCES `informe` (`id_informe`),
  CONSTRAINT `fk_informe_has_paciente_paciente1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente_tiene_sesion` (
  `id_sesion` int NOT NULL,
  `id_paciente` int NOT NULL,
  PRIMARY KEY (`id_sesion`,`id_paciente`),
  KEY `fk_sesion_has_paciente_paciente1_idx` (`id_paciente`),
  KEY `fk_sesion_has_paciente_sesion1_idx` (`id_sesion`),
  CONSTRAINT `fk_sesion_has_paciente_paciente1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `fk_sesion_has_paciente_sesion1` FOREIGN KEY (`id_sesion`) REFERENCES `sesion` (`id_sesion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `perfil` (
  `id_perfil` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_perfil`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `perfil_tiene_permiso` (
  `id_perfil` int NOT NULL,
  `id_permiso` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_permiso`),
  KEY `permiso_id` (`id_permiso`),
  CONSTRAINT `perfil_tiene_permiso_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`),
  CONSTRAINT `perfil_tiene_permiso_ibfk_2` FOREIGN KEY (`id_permiso`) REFERENCES `permiso` (`id_permiso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permiso` (
  `id_permiso` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `id_modulo` int NOT NULL,
  `id_accion` int NOT NULL,
  PRIMARY KEY (`id_permiso`),
  KEY `modulo_id` (`id_modulo`),
  KEY `accion_id` (`id_accion`),
  CONSTRAINT `permiso_ibfk_1` FOREIGN KEY (`id_modulo`) REFERENCES `modulo` (`id_modulo`),
  CONSTRAINT `permiso_ibfk_2` FOREIGN KEY (`id_accion`) REFERENCES `accion` (`id_accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `persona` (
  `id_persona` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_persona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `psicologo` (
  `id_psicologo` int NOT NULL AUTO_INCREMENT,
  `id_persona` int NOT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `numero_licencia` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_psicologo`),
  KEY `persona_id` (`id_persona`),
  CONSTRAINT `psicologo_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recordatorio_enviado` (
  `id_sesion` int NOT NULL,
  `id_usuario` int NOT NULL,
  `canal` varchar(20) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sesion`,`id_usuario`,`canal`),
  KEY `recordatorio_enviado_ibfk_usuario` (`id_usuario`),
  CONSTRAINT `recordatorio_enviado_ibfk_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `sesion` (`id_sesion`) ON DELETE CASCADE,
  CONSTRAINT `recordatorio_enviado_ibfk_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sesion` (
  `id_sesion` int NOT NULL AUTO_INCREMENT,
  `id_psicologo` int NOT NULL,
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime DEFAULT NULL,
  `id_modalidad` int NOT NULL,
  `id_estado` int NOT NULL,
  `enlace_videollamada` varchar(255) DEFAULT NULL,
  `estado_pago` varchar(20) NOT NULL DEFAULT 'Pendiente',
  `id_medio_de_pago` int DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `psicologo_id` (`id_psicologo`),
  KEY `modalidad_id` (`id_modalidad`),
  KEY `estado_id` (`id_estado`),
  KEY `medio_de_pago_id` (`id_medio_de_pago`),
  CONSTRAINT `sesion_ibfk_1` FOREIGN KEY (`id_psicologo`) REFERENCES `psicologo` (`id_psicologo`),
  CONSTRAINT `sesion_ibfk_3` FOREIGN KEY (`id_modalidad`) REFERENCES `modalidad` (`id_modalidad`),
  CONSTRAINT `sesion_ibfk_4` FOREIGN KEY (`id_estado`) REFERENCES `estado` (`id_estado`),
  CONSTRAINT `sesion_ibfk_medio_pago` FOREIGN KEY (`id_medio_de_pago`) REFERENCES `medio_de_pago` (`id_medio_de_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `id_persona` int NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `ultimo_acceso` datetime DEFAULT NULL,
  `mfa_habilitado` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_secreto` varchar(255) DEFAULT NULL,
  `mfa_codigos_recuperacion` text,
  `intentos_fallidos` int NOT NULL DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `reset_token_hash` char(64) DEFAULT NULL,
  `reset_expira` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `persona_id` (`id_persona`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario_tiene_perfil` (
  `id_usuario` int NOT NULL,
  `id_perfil` int NOT NULL,
  PRIMARY KEY (`id_usuario`,`id_perfil`),
  KEY `perfil_id` (`id_perfil`),
  CONSTRAINT `usuario_tiene_perfil_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `usuario_tiene_perfil_ibfk_2` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


SET FOREIGN_KEY_CHECKS = 1;
