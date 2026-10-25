-- Generado por scripts/generar-esquema-docker.mjs. No editar a mano.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `accion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `actividad_seguimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seguimiento_id` int NOT NULL,
  `descripcion` text NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `respuesta` varchar(20) DEFAULT NULL,
  `comentario` text,
  `fecha_respuesta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_actividad_seguimiento` (`seguimiento_id`,`orden`),
  CONSTRAINT `actividad_seguimiento_ibfk_seguimiento` FOREIGN KEY (`seguimiento_id`) REFERENCES `informe_seguimiento` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auditoria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `accion` varchar(40) NOT NULL,
  `modulo` varchar(40) NOT NULL,
  `entidad_id` varchar(50) DEFAULT NULL,
  `detalle` varchar(500) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_fecha` (`fecha`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_modulo` (`modulo`),
  KEY `idx_auditoria_accion` (`accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `estado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `historia_clinica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `psicologo_id` int NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_historia_paciente_psicologo` (`paciente_id`,`psicologo_id`),
  KEY `historia_clinica_ibfk_psicologo` (`psicologo_id`),
  CONSTRAINT `historia_clinica_ibfk_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `paciente` (`id`),
  CONSTRAINT `historia_clinica_ibfk_psicologo` FOREIGN KEY (`psicologo_id`) REFERENCES `psicologo` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `horario_disponible` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psicologo_id` int NOT NULL,
  `dia_semana` tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_horario_psicologo` (`psicologo_id`,`dia_semana`),
  CONSTRAINT `horario_disponible_ibfk_psicologo` FOREIGN KEY (`psicologo_id`) REFERENCES `psicologo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `informe` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psicologo_id` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `contenido` text NOT NULL,
  `etiquetas` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL,
  `es_privado` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `psicologo_id` (`psicologo_id`),
  CONSTRAINT `informe_ibfk_1` FOREIGN KEY (`psicologo_id`) REFERENCES `psicologo` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `informe_seguimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `informe_id` int NOT NULL,
  `resumen` text NOT NULL,
  `pautas` text,
  `avances` text,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_seguimiento_informe` (`informe_id`),
  CONSTRAINT `informe_seguimiento_ibfk_informe` FOREIGN KEY (`informe_id`) REFERENCES `informe` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medio_de_pago` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modalidad` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modulo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notificacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `sesion_id` int DEFAULT NULL,
  `tipo` varchar(30) NOT NULL,
  `titulo` varchar(120) NOT NULL,
  `mensaje` varchar(500) NOT NULL,
  `leida` tinyint NOT NULL DEFAULT '0',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notificacion_usuario` (`usuario_id`,`leida`,`fecha`),
  KEY `idx_notificacion_sesion` (`sesion_id`,`tipo`),
  CONSTRAINT `notificacion_ibfk_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notificacion_ibfk_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `obra_social` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `persona_id` int NOT NULL,
  `obra_social_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `persona_id` (`persona_id`),
  KEY `obra_social_id` (`obra_social_id`),
  CONSTRAINT `paciente_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`),
  CONSTRAINT `paciente_ibfk_2` FOREIGN KEY (`obra_social_id`) REFERENCES `obra_social` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente_tiene_informe` (
  `informe_id` int NOT NULL,
  `paciente_id` int NOT NULL,
  PRIMARY KEY (`informe_id`,`paciente_id`),
  KEY `fk_informe_has_paciente_paciente1_idx` (`paciente_id`),
  KEY `fk_informe_has_paciente_informe1_idx` (`informe_id`),
  CONSTRAINT `fk_informe_has_paciente_informe1` FOREIGN KEY (`informe_id`) REFERENCES `informe` (`id`),
  CONSTRAINT `fk_informe_has_paciente_paciente1` FOREIGN KEY (`paciente_id`) REFERENCES `paciente` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente_tiene_sesion` (
  `sesion_id` int NOT NULL,
  `paciente_id` int NOT NULL,
  PRIMARY KEY (`sesion_id`,`paciente_id`),
  KEY `fk_sesion_has_paciente_paciente1_idx` (`paciente_id`),
  KEY `fk_sesion_has_paciente_sesion1_idx` (`sesion_id`),
  CONSTRAINT `fk_sesion_has_paciente_paciente1` FOREIGN KEY (`paciente_id`) REFERENCES `paciente` (`id`),
  CONSTRAINT `fk_sesion_has_paciente_sesion1` FOREIGN KEY (`sesion_id`) REFERENCES `sesion` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `perfil` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `perfil_tiene_permiso` (
  `perfil_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  PRIMARY KEY (`perfil_id`,`permiso_id`),
  KEY `permiso_id` (`permiso_id`),
  CONSTRAINT `perfil_tiene_permiso_ibfk_1` FOREIGN KEY (`perfil_id`) REFERENCES `perfil` (`id`),
  CONSTRAINT `perfil_tiene_permiso_ibfk_2` FOREIGN KEY (`permiso_id`) REFERENCES `permiso` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permiso` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `modulo_id` int NOT NULL,
  `accion_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `modulo_id` (`modulo_id`),
  KEY `accion_id` (`accion_id`),
  CONSTRAINT `permiso_ibfk_1` FOREIGN KEY (`modulo_id`) REFERENCES `modulo` (`id`),
  CONSTRAINT `permiso_ibfk_2` FOREIGN KEY (`accion_id`) REFERENCES `accion` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `persona` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `psicologo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `persona_id` int NOT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `numero_licencia` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `persona_id` (`persona_id`),
  CONSTRAINT `psicologo_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recordatorio_enviado` (
  `sesion_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `canal` varchar(20) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sesion_id`,`usuario_id`,`canal`),
  KEY `recordatorio_enviado_ibfk_usuario` (`usuario_id`),
  CONSTRAINT `recordatorio_enviado_ibfk_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recordatorio_enviado_ibfk_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sesion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psicologo_id` int NOT NULL,
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime DEFAULT NULL,
  `modalidad_id` int NOT NULL,
  `estado_id` int NOT NULL,
  `enlace_videollamada` varchar(255) DEFAULT NULL,
  `estado_pago` varchar(20) NOT NULL DEFAULT 'Pendiente',
  `medio_de_pago_id` int DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `psicologo_id` (`psicologo_id`),
  KEY `modalidad_id` (`modalidad_id`),
  KEY `estado_id` (`estado_id`),
  KEY `medio_de_pago_id` (`medio_de_pago_id`),
  CONSTRAINT `sesion_ibfk_1` FOREIGN KEY (`psicologo_id`) REFERENCES `psicologo` (`id`),
  CONSTRAINT `sesion_ibfk_3` FOREIGN KEY (`modalidad_id`) REFERENCES `modalidad` (`id`),
  CONSTRAINT `sesion_ibfk_4` FOREIGN KEY (`estado_id`) REFERENCES `estado` (`id`),
  CONSTRAINT `sesion_ibfk_medio_pago` FOREIGN KEY (`medio_de_pago_id`) REFERENCES `medio_de_pago` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `persona_id` int NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `persona_id` (`persona_id`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario_tiene_perfil` (
  `usuario_id` int NOT NULL,
  `perfil_id` int NOT NULL,
  PRIMARY KEY (`usuario_id`,`perfil_id`),
  KEY `perfil_id` (`perfil_id`),
  CONSTRAINT `usuario_tiene_perfil_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `usuario_tiene_perfil_ibfk_2` FOREIGN KEY (`perfil_id`) REFERENCES `perfil` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


SET FOREIGN_KEY_CHECKS = 1;
