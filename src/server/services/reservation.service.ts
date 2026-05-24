import { Prisma, ReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { RESERVATION_TTL_MS } from "@/server/constants/reservation";
import {
  ConflictError,
  GoneError,
  NotFoundError,
} from "@/server/errors/app-error";
import { toReservationDto } from "@/server/mappers/reservation.mapper";

import type { CreateReservationInput } from "@/validators/reservation";

const reservationInclude = {
  product: { select: { id: true, sku: true, name: true } },
  warehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.ReservationInclude;

/**
 * Atomically increments reserved only when enough stock is available.
 * Two concurrent requests for the last unit: PostgreSQL serializes updates;
 * one UPDATE succeeds, the other affects 0 rows → 409.
 */
async function reserveStock(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const updated = await tx.$queryRaw<{ id: string }[]>`
    UPDATE inventories
    SET reserved = reserved + ${quantity},
        "updatedAt" = NOW()
    WHERE "productId" = ${productId}::uuid
      AND "warehouseId" = ${warehouseId}::uuid
      AND ("onHand" - reserved) >= ${quantity}
    RETURNING id
  `;

  if (updated.length === 0) {
    throw new ConflictError();
  }
}

async function releaseStock(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  await tx.$executeRaw`
    UPDATE inventories
    SET reserved = GREATEST(0, reserved - ${quantity}),
        "updatedAt" = NOW()
    WHERE "productId" = ${productId}::uuid
      AND "warehouseId" = ${warehouseId}::uuid
  `;
}

async function confirmStock(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const updated = await tx.$queryRaw<{ id: string }[]>`
    UPDATE inventories
    SET "onHand" = "onHand" - ${quantity},
        reserved = GREATEST(0, reserved - ${quantity}),
        "updatedAt" = NOW()
    WHERE "productId" = ${productId}::uuid
      AND "warehouseId" = ${warehouseId}::uuid
      AND reserved >= ${quantity}
      AND "onHand" >= ${quantity}
    RETURNING id
  `;

  if (updated.length === 0) {
    throw new ConflictError("Unable to confirm reservation — inventory state is inconsistent");
  }
}

export async function createReservation(input: CreateReservationInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.reservation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: reservationInclude,
    });
    if (existing) {
      return toReservationDto(existing);
    }
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new NotFoundError("Product not found");

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
  });
  if (!warehouse) throw new NotFoundError("Warehouse not found");

  const inventory = await prisma.inventory.findUnique({
    where: {
      productId_warehouseId: {
        productId: input.productId,
        warehouseId: input.warehouseId,
      },
    },
  });
  if (!inventory) {
    throw new NotFoundError("No inventory for this product at the selected warehouse");
  }

  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      await reserveStock(tx, input.productId, input.warehouseId, input.quantity);

      return tx.reservation.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          status: ReservationStatus.PENDING,
          expiresAt,
          idempotencyKey: input.idempotencyKey,
        },
        include: reservationInclude,
      });
    });

    return toReservationDto(reservation);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: reservationInclude,
      });
      if (existing) return toReservationDto(existing);
    }
    throw error;
  }
}

export async function confirmReservation(reservationId: string) {
  const reservation = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM reservations WHERE id = ${reservationId}::uuid FOR UPDATE
    `;

    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: reservationInclude,
    });

    if (!locked) throw new NotFoundError("Reservation not found");

    if (locked.status === ReservationStatus.CONFIRMED) {
      return locked;
    }

    if (locked.status !== ReservationStatus.PENDING) {
      throw new ConflictError(`Cannot confirm reservation with status ${locked.status}`);
    }

    if (locked.expiresAt <= new Date()) {
      await releaseStock(tx, locked.productId, locked.warehouseId, locked.quantity);
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.EXPIRED,
          releasedAt: new Date(),
        },
      });
      throw new GoneError();
    }

    await confirmStock(tx, locked.productId, locked.warehouseId, locked.quantity);

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: reservationInclude,
    });
  });

  return toReservationDto(reservation);
}

export async function releaseReservation(reservationId: string) {
  const reservation = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM reservations WHERE id = ${reservationId}::uuid FOR UPDATE
    `;

    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: reservationInclude,
    });

    if (!locked) throw new NotFoundError("Reservation not found");

    if (
      locked.status === ReservationStatus.RELEASED ||
      locked.status === ReservationStatus.EXPIRED
    ) {
      return locked;
    }

    if (locked.status === ReservationStatus.CONFIRMED) {
      throw new ConflictError("Cannot release a confirmed reservation");
    }

    if (locked.status === ReservationStatus.PENDING) {
      await releaseStock(tx, locked.productId, locked.warehouseId, locked.quantity);
      return tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
        include: reservationInclude,
      });
    }

    return locked;
  });

  return toReservationDto(reservation);
}

export async function expireReservationIfNeeded(reservationId: string) {
  const item = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!item || item.status !== ReservationStatus.PENDING || item.expiresAt > new Date()) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.reservation.findUnique({ where: { id: reservationId } });
    if (!locked || locked.status !== ReservationStatus.PENDING || locked.expiresAt > new Date()) {
      return;
    }
    await releaseStock(tx, locked.productId, locked.warehouseId, locked.quantity);
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.EXPIRED, releasedAt: new Date() },
    });
  });

  return true;
}

export async function expirePendingReservations() {
  const expired = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lte: new Date() },
    },
    take: 100,
  });

  let count = 0;
  for (const item of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        const locked = await tx.reservation.findUnique({
          where: { id: item.id },
        });
        if (!locked || locked.status !== ReservationStatus.PENDING) return;
        if (locked.expiresAt > new Date()) return;

        await releaseStock(tx, locked.productId, locked.warehouseId, locked.quantity);
        await tx.reservation.update({
          where: { id: locked.id },
          data: {
            status: ReservationStatus.EXPIRED,
            releasedAt: new Date(),
          },
        });
        count += 1;
      });
    } catch (error) {
      console.error("[expire] failed for reservation", item.id, error);
    }
  }

  return { expired: count };
}
