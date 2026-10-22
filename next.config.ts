import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeORM y mysql2 se cargan tal cual en el servidor (no se empaquetan),
  // así funcionan sus decoradores y la conexión a MySQL.
  serverExternalPackages: ["typeorm", "mysql2"],
  experimental: {
    // Al compilar para producción no se acortan los nombres de las clases del servidor:
    // TypeORM busca las entidades por su nombre y, si se acortan, no las encuentra.
    serverMinification: false,
  },
};

export default nextConfig;
