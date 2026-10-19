import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeORM y mysql2 se cargan tal cual en el servidor (no se empaquetan),
  // así funcionan sus decoradores y la conexión a MySQL.
  serverExternalPackages: ["typeorm", "mysql2"],
};

export default nextConfig;
