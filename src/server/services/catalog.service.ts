import { prisma } from "@/lib/db/prisma";

export async function listProducts() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      inventories: {
        include: { warehouse: true },
        orderBy: { warehouse: { code: "asc" } },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    inventories: product.inventories.map((inv) => ({
      id: inv.id,
      warehouseId: inv.warehouseId,
      warehouse: {
        id: inv.warehouse.id,
        code: inv.warehouse.code,
        name: inv.warehouse.name,
        region: inv.warehouse.region,
      },
      onHand: inv.onHand,
      reserved: inv.reserved,
      available: inv.onHand - inv.reserved,
    })),
  }));
}

export async function listWarehouses() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { inventories: true } },
    },
  });

  return warehouses.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    region: w.region,
    inventoryCount: w._count.inventories,
  }));
}

export async function getReservationById(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    },
  });

  if (
    reservation?.status === "PENDING" &&
    reservation.expiresAt <= new Date()
  ) {
    const { expireReservationIfNeeded } = await import("./reservation.service");
    await expireReservationIfNeeded(id);
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
  }

  return reservation;
}
