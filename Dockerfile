# Imagen de la aplicación MemoPsy (Next.js sobre Node.js).
# Se construye en tres etapas para que la imagen final solo tenga lo necesario para ejecutar.

# 1) Dependencias completas, para compilar
FROM node:22-bookworm-slim AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Compilación de Next.js
FROM node:22-bookworm-slim AS compilacion
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
# La clave pública del formulario de contacto queda incluida en la página al compilar
ARG NEXT_PUBLIC_WEB3FORMS_KEY=""
ENV NEXT_PUBLIC_WEB3FORMS_KEY=$NEXT_PUBLIC_WEB3FORMS_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Ejecución: solo dependencias de producción y lo compilado
FROM node:22-bookworm-slim AS ejecucion
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Argentina/Buenos_Aires
# Zona horaria del consultorio: las fechas de los turnos se guardan en hora de Argentina
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=compilacion /app/.next ./.next
COPY --from=compilacion /app/public ./public
COPY --from=compilacion /app/next.config.ts ./next.config.ts
COPY --from=compilacion /app/scripts ./scripts
# No se ejecuta como root dentro del contenedor
USER node
EXPOSE 3000
CMD ["npm", "start"]
