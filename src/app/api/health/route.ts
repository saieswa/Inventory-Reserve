import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/health
 *
 * Phase 1 smoke test: proves the API layer can reach PostgreSQL via Prisma.
 * Returns 503 if DATABASE_URL is missing or the DB is unreachable.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message:
          "Check DATABASE_URL in .env and that your Neon/Supabase instance is running.",
      },
      { status: 503 },
    );
  }
}
