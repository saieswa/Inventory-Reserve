import { NextRequest } from "next/server";

import { jsonData, jsonError } from "@/lib/api/response";
import { expirePendingReservations } from "@/server/services/reservation.service";

/**
 * GET /api/cron/expire-reservations
 *
 * Vercel Cron invokes this on a schedule. Protected by CRON_SECRET in production.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await expirePendingReservations();
    return jsonData(result);
  } catch (error) {
    return jsonError(error);
  }
}
