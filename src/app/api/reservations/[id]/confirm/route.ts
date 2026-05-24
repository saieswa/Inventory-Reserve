import { NextRequest } from "next/server";

import { withIdempotency } from "@/lib/api/idempotency";
import { jsonError } from "@/lib/api/response";
import { confirmReservation } from "@/server/services/reservation.service";

/** POST /api/reservations/:id/confirm — payment succeeded (410 if expired) */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    return await withIdempotency(request, `confirm:${id}`, async () => {
      const reservation = await confirmReservation(id);
      return { status: 200, body: { reservation } };
    });
  } catch (error) {
    return jsonError(error);
  }
}
