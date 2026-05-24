import { NextRequest } from "next/server";

import { withIdempotency } from "@/lib/api/idempotency";
import { jsonError } from "@/lib/api/response";
import { createReservation } from "@/server/services/reservation.service";
import { createReservationSchema } from "@/validators/reservation";

/** POST /api/reservations — reserve units (409 if insufficient stock) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createReservationSchema.parse(body);

    return await withIdempotency(request, "reserve", async () => {
      const reservation = await createReservation(input);
      return { status: 201, body: { reservation } };
    });
  } catch (error) {
    return jsonError(error);
  }
}
