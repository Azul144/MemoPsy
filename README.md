# MemoPsy

Aplicación web para consultorios de psicología clínica individual de la Provincia de Formosa. Reúne en un solo lugar la historia clínica, las notas de cada sesión, la agenda de turnos y el seguimiento del paciente entre sesiones, con controles de seguridad acordes a la Ley N.º 25.326 de Protección de Datos Personales y a la Ley N.º 26.529 de Derechos del Paciente.

Es el desarrollo del Trabajo Integrador Final (TIF) de la Licenciatura en Sistemas de Información (Universidad de la Cuenca del Plata), de Azul Yanel Coronel.

## Qué hace

El sistema se organiza en cuatro módulos:

- **Usuarios:** alta de cuentas, inicio de sesión con verificación en dos pasos, recuperación de contraseña por email y registro de auditoría.
- **Informes:** notas clínicas privadas del psicólogo, con dictado por voz y ordenamiento asistido por inteligencia artificial; informe de seguimiento para el paciente; historia clínica completa; descarga en PDF.
- **Gestión de Sesiones:** agenda de turnos sin superposiciones, reprogramación por el paciente dentro de los horarios que habilita el psicólogo, recordatorios por email, enlace de videollamada (Google Meet o Jitsi Meet) y registro de pagos.
- **Gestión de Perfiles y Permisos:** perfiles con permisos por módulo y acción (control de acceso basado en roles).

## Tecnologías

| Parte | Tecnología |
|---|---|
| Interfaz y servidor | Next.js 15 (App Router) con React 19 y TypeScript |
| Estilos | Tailwind CSS 4 y componentes de shadcn/ui (Radix UI) |
| Base de datos | MySQL 8, con TypeORM como mapeo objeto-relacional |
| Sesión | NextAuth (JWT) y verificación en dos pasos propia con TOTP (otplib) |
| Contraseñas y datos | bcrypt para las contraseñas y AES-256-GCM para los datos clínicos |
| Servicios externos | Brevo (correo), Anthropic (IA), Google Calendar/Meet o Jitsi Meet (videollamada) |
| Despliegue | Docker y Docker Compose |

## Cómo ponerlo en marcha

### Opción 1: con Docker (recomendada para mostrarlo)

Hace falta Docker Desktop. No hace falta instalar Node.js ni MySQL.

1. Copiar `.env.docker.example` como `.env.docker` y completar las claves (el archivo explica cada una).
2. Levantar los contenedores:

   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

3. Entrar a <http://localhost:8080>.
4. Solo la primera vez, con la base vacía, crear el administrador:

   ```bash
   docker compose exec app node scripts/crear-admin.mjs <email> <contraseña> <nombre> <apellido> <dni>
   ```

Para apagarlo se usa `docker compose down`. **No** agregar `-v`, porque borra la base de datos.

### Opción 2: en modo desarrollo

Hace falta Node.js 20 o superior y un servidor MySQL (por ejemplo, el de WampServer) con la base `psicologia_db`.

1. Instalar las dependencias:

   ```bash
   npm install
   ```

2. Crear `.env.local` con las mismas variables de `.env.docker.example`, más los datos de conexión a la base (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`).
3. Si la base es nueva, correr en orden los scripts de `scripts/migraciones` y de `scripts/datos` (el orden está en [docs/codigo.md](docs/codigo.md#base-de-datos)).
4. Arrancar el servidor:

   ```bash
   npm run dev
   ```

5. Entrar a <http://localhost:3000>.

Los cambios en `.env.local` se toman recién al reiniciar `npm run dev`. Los recordatorios por email se envían mientras el servidor está prendido: cada 10 minutos busca los turnos de las próximas 24 horas.

### Datos de demostración

`node scripts/cargar-demo.mjs` carga psicólogos, pacientes, turnos y notas **ficticios** para probar el sistema. Ningún dato corresponde a personas reales.

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Compila la versión de producción |
| `npm start` | Sirve la versión compilada |
| `npm run lint` | Revisa el código con ESLint |

## Cómo está organizado el código

La guía completa del código (carpetas, capas, módulos, seguridad y convenciones de nombres) está en [docs/codigo.md](docs/codigo.md). Los casos de prueba del dictado, la IA y los recordatorios están en [docs/pruebas](docs/pruebas).

```text
src/
  app/            páginas (App Router) y rutas de la API
  components/     componentes de React, agrupados por pantalla o función
  config/         módulos del sistema (menú y panel principal)
  entities/       tablas de la base como clases de TypeORM
  lib/            lógica del servidor: seguridad, auditoría, turnos, IA, PDF, avisos
  dto/ models/ repositories/ services/   capas del patrón Repositorio (rutas más antiguas)
  middleware.ts   control de acceso en cada pedido
scripts/          carga de datos, administración y migraciones de la base
docker/           scripts con los que el contenedor de MySQL arma la base
docs/             documentación y casos de prueba
```

## Enlaces

- Repositorio: <https://github.com/Azul144/MemoPsy>
- Tablero Kanban: <https://github.com/users/Azul144/projects/1>
