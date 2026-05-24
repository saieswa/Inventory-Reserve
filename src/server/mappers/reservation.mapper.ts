import type { Prisma } from "@prisma/client";

export type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    product: { select: { id: true; sku: true; name: true } };
    warehouse: { select: { id: true; code: true; name: true } };
  };
}>;

export function toReservationDto(reservation: ReservationWithRelations) {
  return {
    id: reservation.id,
    productId: reservation.productId,
    warehouseId: reservation.warehouseId,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    product: reservation.product,
    warehouse: reservation.warehouse,
  };
}
