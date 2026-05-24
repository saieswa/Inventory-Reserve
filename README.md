# Inventory Reservation System

A production-style checkout reservation system for multi-warehouse retail. When a customer proceeds to checkout, stock is **held for 10 minutes**. Payment confirmation permanently decrements inventory; failure, cancellation, or expiry releases the hold.

Built for the **Allo Health Engineering take-home exercise**.

## Live demo

🚀 **Live Application:** [https://inventory-reserve.onrender.com/products](https://inventory-reserve.onrender.com/products)

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | PostgreSQL (Neon) via Prisma |
| Validation | Zod |
| UI | Tailwind CSS v4 + shadcn/ui |
| Client data | TanStack React Query |
| Expiry | Vercel Cron (every 2 min) + lazy expiry on read |
| Idempotency | Postgres `idempotency_records` + unique `idempotencyKey` on reservations |

## Features (assignment checklist)

- [x] Products, warehouses, inventory (`onHand` / `reserved`), reservations with status + expiry
- [x] `GET /api/products` — available stock per warehouse
- [x] `GET /api/warehouses`
- [x] `POST /api/reservations` — **409** when insufficient stock
- [x] `POST /api/reservations/:id/confirm` — **410** when expired
- [x] `POST /api/reservations/:id/release`
- [x] **Concurrency-safe** reserve via atomic `UPDATE … WHERE (onHand - reserved) >= qty`
- [x] Product listing + checkout UI with countdown, confirm/cancel, toasts for 409/410
- [x] Automatic expiry (cron + lazy cleanup on GET reservation)
- [x] **Bonus:** `Idempotency-Key` header on reserve & confirm

## Local setup

### Prerequisites

- Node.js 20+
- A hosted PostgreSQL database ([Neon](https://neon.tech) or [Supabase](https://supabase.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pooled Postgres connection string |
| `DIRECT_URL` | Direct connection for Prisma migrations (Neon non-pooler host) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |
| `CRON_SECRET` | Random string; secures `/api/cron/expire-reservations` in production |
| `REDIS_URL` | Optional (reserved for future distributed locking) |

### 3. Migrate & seed

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000/products](http://localhost:3000/products).

### 5. Health check

```bash
curl http://localhost:3000/api/health
```

## API reference

### `GET /api/products`

Returns products with per-warehouse `onHand`, `reserved`, and `available` (`onHand - reserved`).

### `GET /api/warehouses`

Returns warehouses with inventory counts.

### `POST /api/reservations`

```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 1
}
```

| Status | Meaning |
|--------|---------|
| `201` | Reservation created (`PENDING`, `expiresAt` = now + 10 min) |
| `409` | Not enough available stock |
| `404` | Product/warehouse/inventory not found |

Header: `Idempotency-Key` (optional) — replays return the cached response for 24h.

### `POST /api/reservations/:id/confirm`

| Status | Meaning |
|--------|---------|
| `200` | Confirmed; `onHand` and `reserved` reduced |
| `410` | Reservation expired |
| `409` | Invalid state (e.g. already released) |

### `POST /api/reservations/:id/release`

| Status | Meaning |
|--------|---------|
| `200` | Released; `reserved` decremented |

## Concurrency strategy

**Problem:** Two shoppers reserve the last unit at the same time.

**Solution:** A single atomic SQL `UPDATE` inside a transaction:

```sql
UPDATE inventories
SET reserved = reserved + :qty
WHERE "productId" = :pid AND "warehouseId" = :wid
  AND ("onHand" - reserved) >= :qty
RETURNING id;
```

If zero rows are updated → **409 Conflict**. PostgreSQL serializes concurrent updates on the same row, so only one request succeeds.

Confirm/release use `SELECT … FOR UPDATE` on the reservation row to avoid double-processing.

### Test concurrency locally

With the dev server running:

```bash
# Reset hub stock if needed (re-seed or release reservations first)
node scripts/test-concurrency.mjs
```

Try reserving **USB-C Hub @ WH-EAST** from two browser tabs simultaneously — only one should succeed.

## Expiry mechanism (production)

1. **Vercel Cron** — `vercel.json` runs `GET /api/cron/expire-reservations` every 2 minutes. Set `CRON_SECRET` and send `Authorization: Bearer <CRON_SECRET>`.
2. **Lazy cleanup** — `GET /api/reservations/:id` expires a single stale `PENDING` reservation before returning.
3. **Confirm path** — confirming an expired reservation returns **410** and marks it `EXPIRED`.

## Deployment (Vercel + Neon)

1. Push to GitHub.
2. Import project in [Vercel](https://vercel.com).
3. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (your Vercel URL).
4. Build command: `npx prisma migrate deploy && npm run build`
5. After deploy: `npx prisma db seed` against production DB (or run seed from CI once).

Enable Vercel Cron in the project dashboard (Hobby plan supports cron).

## Project structure

```
src/
├── app/api/          # Route handlers (thin)
├── server/services/  # Business logic + transactions
├── server/mappers/   # DTO shaping
├── validators/       # Zod schemas
├── hooks/            # React Query
└── components/       # UI
```

## Trade-offs & future work

| Decision | Trade-off |
|----------|-----------|
| Atomic `UPDATE` vs explicit `FOR UPDATE` on inventory | Simpler, fewer round-trips; sufficient for per-SKU row contention |
| Cron every 2 min | Stock may appear held up to ~2 min after expiry; lazy read reduces this for active users |
| Postgres idempotency vs Redis | No extra infra; good for take-home; Redis better at scale |
| Quantity fixed to 1 in UI | Faster demo; API supports any positive quantity |

**With more time:** integration tests, `FOR UPDATE` on inventory row + service-layer tests, Upstash Redis for distributed locks, rate limiting, observability (OpenTelemetry), admin dashboard.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Prisma Studio |

## License

MIT — take-home submission.
