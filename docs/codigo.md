# Guía del código de MemoPsy

Este documento explica cómo está organizado el código, qué hace cada carpeta y qué convenciones se siguen. Complementa el capítulo 8 del TIF: el apartado 8.4 describe la arquitectura, el 8.4.2 el paradigma y las convenciones de nombres, y el 8.4.3 muestra capturas de los fragmentos principales.

## Arquitectura en pocas palabras

MemoPsy es una sola aplicación de Next.js que contiene la interfaz y el servidor. Se organiza en tres capas:

1. **Presentación:** las páginas de `src/app` y los componentes de `src/components`, escritos en React.
2. **Lógica de negocio:** las rutas de la API en `src/app/api`, que usan las funciones de `src/lib` o, en las rutas más antiguas, las capas del patrón Repositorio.
3. **Datos:** las entidades de TypeORM en `src/entities`, que se corresponden con las tablas de MySQL.

Antes de llegar a una página o a la API, cada pedido pasa por `src/middleware.ts`, que verifica la sesión y el permiso del rol.

```text
Navegador ──HTTPS──> middleware.ts ──> página (src/app/...)        ──> componentes (src/components)
                       │                                              │
                       │ sesión JWT + permiso                         └──> fetch a la API
                       ▼
                     API (src/app/api/...) ──> src/lib (funciones)      ──> TypeORM ──> MySQL
                                           └─> controllers → services → repositories ─┘
```

## Carpetas

### `src/app`: páginas y API

Next.js arma las direcciones del sitio a partir de las carpetas. Por eso **no se cambian de lugar**: mover una carpeta cambia la URL.

| Carpeta | Contenido |
|---|---|
| `page.tsx`, `layout.tsx`, `globals.css` | Sitio público (landing), estructura general y estilos (modo oscuro y claro) |
| `(auth)/` | Inicio de sesión, recuperación de contraseña y panel de bienvenida (`welcome`) |
| `(main)/usuarios`, `(main)/perfiles` | Módulos de Usuarios y de Gestión de Perfiles y Permisos |
| `(main)/sesiones` | Módulo de Gestión de Sesiones (agenda, turnos, pagos) |
| `(main)/informes` | Módulo de Informes: notas, informe de seguimiento e historias clínicas |
| `(main)/auditoria` | Consulta del registro de auditoría |
| `api/` | Rutas de la API REST, una carpeta por recurso (ver abajo) |

Los paréntesis, como `(auth)` o `(main)`, agrupan páginas sin agregar nada a la dirección.

### `src/components`: componentes de React

| Carpeta | Contenido |
|---|---|
| `ui/` | Componentes base de shadcn/ui (botones, campos, tablas, diálogos). No se editan a mano salvo para ajustar estilos |
| `comunes/` | Piezas que se usan en todo el sitio: el logo y el fondo animado |
| `landing/` | Secciones del sitio público |
| `acceso/` | Pantallas de acceso: diseño compartido, campo de contraseña y lista de requisitos |
| `mfa/` | Ventanas para activar y desactivar la verificación en dos pasos |
| `sistema/` | Barra superior, encabezado de página, notificaciones, tema, dictado por voz y propuesta de la IA |
| `sesiones/` | Diálogos de la agenda: horarios para reprogramar, pago y reprogramación |
| `informes/` | Sección del informe de seguimiento |
| `proveedores/` | Proveedor de sesión de NextAuth |

### `src/lib`: lógica del servidor

| Carpeta o archivo | Contenido |
|---|---|
| `auth/` | Seguridad: configuración de NextAuth, inicio de sesión con bcrypt y bloqueo, verificación en dos pasos (TOTP), firma del JWT, recuperación de contraseña, cifrado AES-256-GCM, reglas de acceso por rol y alcance de los turnos que ve cada rol |
| `auditoria/` | Registro de eventos de auditoría y envoltorio que lo aplica a las rutas de la API |
| `validaciones/` | Días hábiles, superposición de turnos y reglas de contraseña |
| `sesiones/` | Horarios libres para reprogramar y estado de pago |
| `notificaciones/` | Avisos dentro de la plataforma y recordatorios por email y WhatsApp |
| `videollamada/` | Enlace automático de Google Meet, con Jitsi Meet como respaldo |
| `whatsapp/` | Envío por WhatsApp con Meta o Twilio (programado, sin activar) |
| `email/` | Envío de correos con Brevo |
| `ia/` | Estructuración de la nota dictada con el modelo de Anthropic |
| `informes/`, `historia-clinica/` | Piezas comunes del informe de seguimiento y de la historia clínica |
| `pdf/` | Armado en memoria de los PDF (nota, informe e historia clínica) |
| `controllers/` | Controladores de las rutas más antiguas (patrón Repositorio) |
| `database.ts` | Conexión a MySQL con TypeORM |
| `avisos.tsx`, `telefono.ts`, `especialidades.ts`, `utils.ts` | Utilidades: avisos en pantalla, formato de celular, especialidades y combinación de clases de Tailwind |

### Capas del patrón Repositorio

Las rutas más antiguas (catálogos, usuarios, pacientes, psicólogos y perfiles) siguen el patrón Repositorio, con una carpeta por capa:

| Carpeta | Responsabilidad |
|---|---|
| `src/lib/controllers` | Recibe el pedido, controla la sesión y arma la respuesta |
| `src/services` | Aplica las reglas de negocio |
| `src/repositories` | Accede a los datos con TypeORM |
| `src/models` | Clases del dominio con encapsulamiento y validaciones |
| `src/dto` | Forma de los datos que entran y salen de la API |

Cada capa recibe la siguiente en su constructor. Las funciones que se agregaron en las etapas finales (horarios libres, avisos, recordatorios, historia clínica) se escribieron como funciones independientes en `src/lib`, que reciben la conexión a la base y devuelven el resultado. Las dos formas mantienen separadas la presentación, la lógica y los datos (apartado 8.4.2 del TIF).

### `src/entities`

Una clase por tabla, con decoradores de TypeORM. Las entidades principales heredan de `base-entity.ts`; las intermedias no. Las relaciones de muchos a muchos se resuelven con entidades intermedias (`usuario-tiene-perfil`, `perfil-tiene-permiso`, `paciente-tiene-sesion`, `paciente-tiene-informe`). `index.ts` las exporta todas.

### Otras carpetas de `src`

- `config/modulos.ts`: lista de los módulos del sistema y los permisos que habilitan cada uno (menú y panel de bienvenida).
- `types/`: tipos que amplían NextAuth y permiten importar CSS.
- `middleware.ts`: control de acceso en cada pedido.
- `instrumentation.ts` y `instrumentation-node.ts`: tarea que corre cada 10 minutos para enviar los recordatorios de turno.

## Rutas de la API por módulo

| Módulo | Rutas |
|---|---|
| Usuarios | `/api/auth/*` (sesión, verificación en dos pasos, recuperación), `/api/usuarios`, `/api/personas`, `/api/auditoria` |
| Gestión de Perfiles y Permisos | `/api/perfiles`, `/api/permisos`, `/api/modulos`, `/api/acciones` |
| Gestión de Sesiones | `/api/sesiones` (con `estado`, `pago` y `reprogramar`), `/api/horarios-disponibles`, `/api/notificaciones`, `/api/estados`, `/api/modalidades`, `/api/medios-de-pago` |
| Informes | `/api/informes` (con `pdf`, `seguimiento` y `estructurar`), `/api/seguimientos`, `/api/actividades-seguimiento`, `/api/historias-clinicas` |
| Datos compartidos | `/api/pacientes`, `/api/psicologos`, `/api/obras-sociales` |

Cada ruta necesita una regla en `src/lib/auth/reglas-acceso.ts`. Una ruta de la API sin regla queda **bloqueada**: al agregar una ruta nueva hay que agregar también su regla.

## Seguridad

| Mecanismo | Dónde está |
|---|---|
| Contraseñas con bcrypt, bloqueo tras 5 intentos | `src/lib/auth/login.ts` |
| Verificación en dos pasos (TOTP) y códigos de recuperación | `src/lib/auth/mfa.ts` |
| Sesión firmada (JWT) | `src/lib/auth/jwt.ts` y `auth-config.ts` |
| Cifrado AES-256-GCM de los datos clínicos | `src/lib/auth/cifrado.ts` y `columna-cifrada.ts` |
| Control de acceso por rol | `src/middleware.ts` y `src/lib/auth/reglas-acceso.ts` |
| Qué turnos ve cada rol | `src/lib/auth/alcance-sesiones.ts` |
| Registro de auditoría | `src/lib/auditoria/` |

Las claves (`NEXTAUTH_SECRET`, `MFA_ENCRYPTION_KEY`, `DATOS_ENCRYPTION_KEY` y las de los servicios externos) se leen de variables de entorno y nunca se escriben en el código. `.env.docker.example` explica cada una.

## Base de datos

La estructura completa está en `docker/mysql/01-esquema.sql` y los catálogos en `02-catalogos.sql`. El contenedor de MySQL los ejecuta la primera vez que arranca. Cuando cambia el modelo de datos, se regeneran desde la base de desarrollo con `node --env-file=.env.local scripts/generar-esquema-docker.mjs`.

En una base que ya existía (por ejemplo, la de WampServer), las migraciones de `scripts/migraciones` se corren una sola vez y en este orden:

1. `migracion-pagos-sesion.sql`
2. `migracion-alinear-tif.sql`
3. `migracion-auditoria.sql`
4. `migracion-horarios-disponibles.sql`
5. `migracion-informe-seguimiento.sql`
6. `migracion-notificaciones.sql`
7. `migracion-cifrado-datos.sql` (después, `node scripts/cifrar-datos-existentes.mjs`)
8. `migracion-recordatorios-enviados.sql`
9. `migracion-telefono-persona.sql`
10. `migracion-historia-clinica.sql`
11. `migracion-innodb.sql`
12. `migracion-nomenclatura-ids.sql`

`scripts/datos` tiene los datos iniciales: las obras sociales de Formosa y los permisos de cada rol.

## Scripts

| Script | Para qué sirve |
|---|---|
| `scripts/crear-admin.mjs` | Crea el primer administrador en una base nueva |
| `scripts/cargar-demo.mjs` | Carga datos de demostración ficticios |
| `scripts/cargar-historias-demo.mjs` | Agrega las historias clínicas de demostración |
| `scripts/historias-demo.mjs` | Contenido de esas historias (lo usan los dos anteriores) |
| `scripts/cifrar-datos-existentes.mjs` | Cifra los datos clínicos guardados antes de activar el cifrado |
| `scripts/conectar-google-meet.mjs` | Conecta el sistema con la cuenta de Google para crear reuniones de Meet |
| `scripts/generar-esquema-docker.mjs` | Regenera los scripts de `docker/mysql` |

## Convenciones de nombres

Son las del apartado 8.4.2 del TIF:

- **Base de datos:** tablas y columnas en minúsculas, en singular y con guion bajo (`historia_clinica`, `fecha_hora_inicio`). La clave primaria se llama `id_<tabla>` y cada clave foránea lleva el mismo nombre que la clave a la que apunta.
- **Código:** variables, funciones y propiedades en camelCase (`fechaHoraInicio`); clases, tipos y componentes en PascalCase (`SesionEntity`, `DictadoVoz`); constantes en mayúsculas con guion bajo (`MAX_INTENTOS`).
- **Archivos:** los del servidor en minúsculas con guiones y un sufijo según su capa (`sesion.entity.ts`, `paciente.repository.ts`); los componentes de React en PascalCase (`DictadoVoz.tsx`), salvo los de `components/ui`, que siguen el formato de shadcn/ui.
- **API:** sustantivos en plural (`/api/sesiones`, `/api/obras-sociales`).
- **Idioma:** los nombres del dominio están en castellano, con el vocabulario de los requerimientos. Algunos métodos genéricos de los repositorios más antiguos conservan su nombre en inglés (`findById`, `findAll`).
- **Comentarios:** cada archivo empieza con un comentario que dice qué hace y, cuando corresponde, qué requerimiento cumple (por ejemplo, `RF 3.1`).

## Pendientes conocidos

- Quedan unos 200 avisos de ESLint por el uso de `any` en el código más antiguo. Son solo avisos (no frenan la compilación) y se pueden ir corrigiendo de a poco.
- No hay pruebas automatizadas: las pruebas se hicieron de forma manual y están documentadas en `docs/pruebas`.
