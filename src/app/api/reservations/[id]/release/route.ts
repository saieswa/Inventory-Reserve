import { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { releaseReservation } from "@/server/services/reservation.service";

/** POST /api/reservations/:id/release — cancel or payment failed */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const reservation = await releaseReservation(id);
    return Response.json({ reservation });
  } catch (error) {
    return jsonError(error);
  }
}
