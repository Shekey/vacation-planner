import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/database-url.mjs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection when one is available.
    url: databaseUrl({ direct: true }),
  },
});
