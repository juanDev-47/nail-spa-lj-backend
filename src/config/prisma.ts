// typescript
// src/config/prisma.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient__: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Instancia global para evitar múltiples conexiones en development.
 * Colocar este archivo en la capa "infra/config" (según arquitectura limpia).
 */
const prisma = global.__prismaClient__ ?? new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}

export default prisma;