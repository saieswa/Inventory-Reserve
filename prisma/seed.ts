import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
/**
 * Phase 2 seed — realistic catalog + intentional low stock for concurrency demos.
 *
 * Run: npm run db:seed
 * Requires migrations applied first: npm run db:migrate
 */
async function main() {
  console.log("Seeding database…");

  // Reset holds so inventory counts stay consistent on re-seed
  try {
    await prisma.reservation.deleteMany();
  } catch {
    console.warn("Could not clear reservations (DB blip); continuing…");
  }

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "WM-001" },
      update: {},
      create: {
        sku: "WM-001",
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with USB receiver",
      },
    }),
    prisma.product.upsert({
      where: { sku: "KB-002" },
      update: {},
      create: {
        sku: "KB-002",
        name: "Mechanical Keyboard",
        description: "Tenkeyless mechanical keyboard, brown switches",
      },
    }),
    prisma.product.upsert({
      where: { sku: "HUB-003" },
      update: {},
      create: {
        sku: "HUB-003",
        name: "USB-C Hub",
        description: "7-in-1 USB-C hub — only 1 unit at East (race-condition demo)",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MON-004" },
      update: {},
      create: {
        sku: "MON-004",
        name: '27" 4K Monitor',
        description: "IPS 4K display with adjustable stand",
      },
    }),
  ]);

  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: "WH-EAST" },
      update: {},
      create: {
        code: "WH-EAST",
        name: "East Coast Fulfillment",
        region: "US-East",
      },
    }),
    prisma.warehouse.upsert({
      where: { code: "WH-WEST" },
      update: {},
      create: {
        code: "WH-WEST",
        name: "West Coast Fulfillment",
        region: "US-West",
      },
    }),
    prisma.warehouse.upsert({
      where: { code: "WH-CENTRAL" },
      update: {},
      create: {
        code: "WH-CENTRAL",
        name: "Central Distribution Center",
        region: "US-Central",
      },
    }),
  ]);

  const [mouse, keyboard, hub, monitor] = products;
  const [east, west, central] = warehouses;

  const inventoryRows = [
    { productId: mouse.id, warehouseId: east.id, onHand: 50, reserved: 0 },
    { productId: mouse.id, warehouseId: west.id, onHand: 30, reserved: 0 },
    { productId: keyboard.id, warehouseId: east.id, onHand: 25, reserved: 0 },
    { productId: keyboard.id, warehouseId: west.id, onHand: 15, reserved: 0 },
    { productId: keyboard.id, warehouseId: central.id, onHand: 10, reserved: 0 },
    // Last-unit scenario: two users fighting for the same unit in Phase 4
    { productId: hub.id, warehouseId: east.id, onHand: 1, reserved: 0 },
    { productId: hub.id, warehouseId: west.id, onHand: 12, reserved: 0 },
    { productId: monitor.id, warehouseId: central.id, onHand: 8, reserved: 0 },
    { productId: monitor.id, warehouseId: west.id, onHand: 5, reserved: 0 },
  ];

  for (const row of inventoryRows) {
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: row.productId,
          warehouseId: row.warehouseId,
        },
      },
      update: { onHand: row.onHand, reserved: row.reserved },
      create: row,
    });
  }

  console.log(`  Products:    ${products.length}`);
  console.log(`  Warehouses:  ${warehouses.length}`);
  console.log(`  Inventories: ${inventoryRows.length}`);
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
