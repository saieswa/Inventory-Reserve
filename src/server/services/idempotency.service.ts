import { prisma } from "@/lib/db/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type StoredResponse = {
  statusCode: number;
  body: unknown;
};

/**
 * Postgres-backed idempotency (bonus). Returns cached response when the same
 * Idempotency-Key is replayed within 24 hours.
 */
export async function getIdempotentResponse(
  key: string,
  scope: string,
): Promise<StoredResponse | null> {
  const record = await prisma.idempotencyRecord.findUnique({
    where: { key_scope: { key, scope } },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.idempotencyRecord.delete({
      where: { key_scope: { key, scope } },
    });
    return null;
  }

  return {
    statusCode: record.statusCode,
    body: record.body as unknown,
  };
}

export async function saveIdempotentResponse(
  key: string,
  scope: string,
  statusCode: number,
  body: unknown,
) {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
  await prisma.idempotencyRecord.upsert({
    where: { key_scope: { key, scope } },
    create: {
      key,
      scope,
      statusCode,
      body: body as object,
      expiresAt,
    },
    update: {
      statusCode,
      body: body as object,
      expiresAt,
    },
  });
}
