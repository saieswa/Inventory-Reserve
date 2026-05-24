import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for Next.js.
 *
 * WHY: In development, Next.js hot-reloads modules. Without a global singleton,
 * each reload would create a new PrismaClient and exhaust database connections.
 *
 * USAGE: Import `prisma` only from server code (Route Handlers, Server Actions,
 * cron jobs). Never import this file in Client Components.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
