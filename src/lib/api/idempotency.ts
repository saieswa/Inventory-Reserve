import { NextRequest, NextResponse } from "next/server";

import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from "@/server/services/idempotency.service";

export function getIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key")?.trim();
  return key && key.length >= 8 ? key : null;
}

export async function withIdempotency(
  request: NextRequest,
  scope: string,
  handler: () => Promise<{ status: number; body: unknown }>,
) {
  const key = getIdempotencyKey(request);
  if (key) {
    const cached = await getIdempotentResponse(key, scope);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.statusCode });
    }
  }

  const result = await handler();
  if (key) {
    await saveIdempotentResponse(key, scope, result.status, result.body);
  }

  return NextResponse.json(result.body, { status: result.status });
}
