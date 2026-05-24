import { NextRequest } from "next/server";

import { jsonData, jsonError } from "@/lib/api/response";
import { getReservationById } from "@/server/services/catalog.service";
import { toReservationDto } from "@/server/mappers/reservation.mapper";
import { NotFoundError } from "@/server/errors/app-error";

/** GET /api/reservations/:id — fetch reservation for checkout UI */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const reservation = await getReservationById(id);
    if (!reservation) throw new NotFoundError("Reservation not found");
    return jsonData({ reservation: toReservationDto(reservation) });
  } catch (error) {
    return jsonError(error);
  }
}
