-- Nomenclatura de claves: cada columna id pasa a llamarse id_<tabla> y cada clave foránea
-- toma el nombre de la clave primaria a la que apunta (persona_id -> id_persona).
-- Así queda igual que el diagrama entidad-relación del TIF (Ilustración 18).
-- MySQL actualiza solo las claves foráneas que usan estas columnas.
-- Ejecutar una sola vez, con un backup hecho antes.

ALTER TABLE accion
  RENAME COLUMN id TO id_accion;

ALTER TABLE actividad_seguimiento
  RENAME COLUMN id TO id_actividad_seguimiento,
  RENAME COLUMN seguimiento_id TO id_informe_seguimiento;

ALTER TABLE auditoria
  RENAME COLUMN id TO id_auditoria,
  RENAME COLUMN usuario_id TO id_usuario,
  RENAME COLUMN entidad_id TO id_entidad;

ALTER TABLE estado
  RENAME COLUMN id TO id_estado;

ALTER TABLE historia_clinica
  RENAME COLUMN id TO id_historia_clinica,
  RENAME COLUMN paciente_id TO id_paciente,
  RENAME COLUMN psicologo_id TO id_psicologo;

ALTER TABLE horario_disponible
  RENAME COLUMN id TO id_horario_disponible,
  RENAME COLUMN psicologo_id TO id_psicologo;

ALTER TABLE informe
  RENAME COLUMN id TO id_informe,
  RENAME COLUMN psicologo_id TO id_psicologo;

ALTER TABLE informe_seguimiento
  RENAME COLUMN id TO id_informe_seguimiento,
  RENAME COLUMN informe_id TO id_informe;

ALTER TABLE medio_de_pago
  RENAME COLUMN id TO id_medio_de_pago;

ALTER TABLE modalidad
  RENAME COLUMN id TO id_modalidad;

ALTER TABLE modulo
  RENAME COLUMN id TO id_modulo;

ALTER TABLE notificacion
  RENAME COLUMN id TO id_notificacion,
  RENAME COLUMN usuario_id TO id_usuario,
  RENAME COLUMN sesion_id TO id_sesion;

ALTER TABLE obra_social
  RENAME COLUMN id TO id_obra_social;

ALTER TABLE paciente
  RENAME COLUMN id TO id_paciente,
  RENAME COLUMN persona_id TO id_persona,
  RENAME COLUMN obra_social_id TO id_obra_social;

ALTER TABLE paciente_tiene_informe
  RENAME COLUMN informe_id TO id_informe,
  RENAME COLUMN paciente_id TO id_paciente;

ALTER TABLE paciente_tiene_sesion
  RENAME COLUMN sesion_id TO id_sesion,
  RENAME COLUMN paciente_id TO id_paciente;

ALTER TABLE perfil
  RENAME COLUMN id TO id_perfil;

ALTER TABLE perfil_tiene_permiso
  RENAME COLUMN perfil_id TO id_perfil,
  RENAME COLUMN permiso_id TO id_permiso;

ALTER TABLE permiso
  RENAME COLUMN id TO id_permiso,
  RENAME COLUMN modulo_id TO id_modulo,
  RENAME COLUMN accion_id TO id_accion;

ALTER TABLE persona
  RENAME COLUMN id TO id_persona;

ALTER TABLE psicologo
  RENAME COLUMN id TO id_psicologo,
  RENAME COLUMN persona_id TO id_persona;

ALTER TABLE recordatorio_enviado
  RENAME COLUMN sesion_id TO id_sesion,
  RENAME COLUMN usuario_id TO id_usuario;

ALTER TABLE sesion
  RENAME COLUMN id TO id_sesion,
  RENAME COLUMN psicologo_id TO id_psicologo,
  RENAME COLUMN modalidad_id TO id_modalidad,
  RENAME COLUMN estado_id TO id_estado,
  RENAME COLUMN medio_de_pago_id TO id_medio_de_pago;

ALTER TABLE usuario
  RENAME COLUMN id TO id_usuario,
  RENAME COLUMN persona_id TO id_persona;

ALTER TABLE usuario_tiene_perfil
  RENAME COLUMN usuario_id TO id_usuario,
  RENAME COLUMN perfil_id TO id_perfil;
