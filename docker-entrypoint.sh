#!/bin/sh
set -e

echo "╔════════════════════════════════════════╗"
echo "║     SatsRouter — Starting up...        ║"
echo "╚════════════════════════════════════════╝"

# ── Ensure data directory exists ────────────────────────────────────────
mkdir -p /app/data

# ── 1. Run Prisma migrations ────────────────────────────────────────────
echo "→ Running database migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma
echo "✓ Migrations applied"

# ── 2. Seed database if empty (first boot) ──────────────────────────────
PROVIDER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.provider.count()
  .then(c => { console.log(c); return p.\$disconnect(); })
  .catch(() => { console.log(0); return p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$PROVIDER_COUNT" = "0" ]; then
  echo "→ First boot — seeding demo data..."
  npx tsx scripts/seed.ts 2>&1 || echo "⚠ Seeding failed (non-fatal)"
  echo "✓ Seed complete"
else
  echo "→ Database already has $PROVIDER_COUNT providers, skipping seed"
fi

# ── 3. Start Next.js ────────────────────────────────────────────────────
echo ""
echo "🚀 Starting SatsRouter on port ${PORT:-3000}..."
exec node server.js
