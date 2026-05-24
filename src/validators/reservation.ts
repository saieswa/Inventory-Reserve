import { z } from "zod";

/** POST /api/reservations — implemented in Phase 3 */
export const createReservationSchema = z.object({
  productId: z.uuid(),
  warehouseId: z.uuid(),
  quantity: z.number().int().positive().max(1000),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
