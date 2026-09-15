import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Session-mode (non-pooled) connection: required by the migration engine.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
