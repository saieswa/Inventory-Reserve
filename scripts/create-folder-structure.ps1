# Run from project root:
#   powershell -ExecutionPolicy Bypass -File .\scripts\create-folder-structure.ps1
#
# Or set $ProjectRoot to your path (e.g. inventory-reservation)

param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$dirs = @(
  "prisma",
  "src/app/api/products",
  "src/app/api/warehouses",
  "src/app/api/reservations/[id]/confirm",
  "src/app/api/reservations/[id]/release",
  "src/app/products",
  "src/app/checkout",
  "src/components/ui",
  "src/components/shared",
  "src/lib/db",
  "src/server/constants",
  "src/server/errors",
  "src/server/services",
  "src/providers",
  "src/components/layout",
  "src/types",
  "src/validators"
)

Push-Location $ProjectRoot

foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
  Write-Host "Created: $d"
}

$files = @{
  "prisma/schema.prisma" = @"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
"@
  "prisma/seed.ts" = "import { PrismaClient } from '@prisma/client';`nconst prisma = new PrismaClient();`nasync function main() {}`nmain().finally(() => prisma.`$disconnect());"
  "src/lib/db/prisma.ts" = "// Prisma client singleton (server-only)"
  "src/lib/errors.ts" = "// Custom error classes"
  "src/lib/utils.ts" = "// Shared utilities (shadcn cn helper)"
  "src/types/index.ts" = "// Shared TypeScript types"
  "src/validators/reservation.ts" = "// Zod schemas"
  "src/app/api/products/route.ts" = "// GET /api/products"
  "src/app/api/warehouses/route.ts" = "// GET /api/warehouses"
  "src/app/api/reservations/route.ts" = "// POST /api/reservations"
  "src/app/api/reservations/[id]/confirm/route.ts" = "// POST confirm"
  "src/app/api/reservations/[id]/release/route.ts" = "// POST release"
  "src/app/products/page.tsx" = "// Product listing"
  "src/app/checkout/page.tsx" = "// Reservation checkout"
  ".env.example" = "DATABASE_URL=`"postgresql://...`"`nNEXT_PUBLIC_APP_URL=`"http://localhost:3000`""
}

foreach ($entry in $files.GetEnumerator()) {
  $path = $entry.Key
  if (-not (Test-Path $path)) {
    $parent = Split-Path $path -Parent
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Set-Content -Path $path -Value $entry.Value -Encoding utf8
    Write-Host "Created file: $path"
  } else {
    Write-Host "Skipped (exists): $path"
  }
}

Pop-Location
Write-Host "`nDone. Folder structure matches inventory-reservation layout."
