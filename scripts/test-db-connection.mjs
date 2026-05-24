import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("DB OK", result);
} catch (error) {
  console.error("DB FAIL", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
