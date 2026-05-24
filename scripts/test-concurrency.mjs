/**
 * Fires two simultaneous reserve requests for the last unit of HUB-003 @ WH-EAST.
 * Expected: one 201, one 409.
 *
 * Usage: node scripts/test-concurrency.mjs
 * Requires: npm run dev (or set BASE_URL)
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const { products } = await productsRes.json();
  const hub = products.find((p) => p.sku === "HUB-003");
  const east = hub?.inventories.find((i) => i.warehouse.code === "WH-EAST");

  if (!hub || !east) {
    console.error("Seed data missing HUB-003 @ WH-EAST");
    process.exit(1);
  }

  const body = JSON.stringify({
    productId: hub.id,
    warehouseId: east.warehouseId,
    quantity: 1,
  });

  const reserve = () =>
    fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body,
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  console.log("Sending 2 concurrent reserve requests for last USB-C Hub @ East…");
  const [a, b] = await Promise.all([reserve(), reserve()]);

  console.log("Request A:", a.status, a.body.error ?? a.body.reservation?.id);
  console.log("Request B:", b.status, b.body.error ?? b.body.reservation?.id);

  const statuses = [a.status, b.status].sort();
  if (statuses[0] === 201 && statuses[1] === 409) {
    console.log("\nPASS — exactly one reservation succeeded.");
  } else {
    console.log("\nUNEXPECTED — expected one 201 and one 409.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
