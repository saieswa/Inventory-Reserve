import type {
  Inventory,
  Product,
  Reservation,
  ReservationStatus,
  Warehouse,
} from "@prisma/client";

/** Re-export Prisma enums/types for use in API DTOs and UI. */
export type {
  Inventory,
  Product,
  Reservation,
  ReservationStatus,
  Warehouse,
};

/** Product with per-warehouse stock (GET /api/products). */
export type ProductWithInventory = Product & {
  inventories: (Inventory & {
    warehouse: Warehouse;
    available: number;
  })[];
};

/** Warehouse summary (GET /api/warehouses). */
export type WarehouseSummary = Warehouse & {
  _count: { inventories: number };
};

/** Reservation returned by create/confirm/release APIs (Phase 3). */
export type ReservationDto = Reservation & {
  product: Pick<Product, "id" | "sku" | "name">;
  warehouse: Pick<Warehouse, "id" | "code" | "name">;
};
