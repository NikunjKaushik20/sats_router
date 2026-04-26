#!/bin/sh
set -e

echo "╔════════════════════════════════════════╗"
echo "║     SatsRouter — Starting up...        ║"
echo "╚════════════════════════════════════════╝"

# ── 1. Run Prisma migrations ────────────────────────────────────────────
echo "→ Running database migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "⚠ Migration failed — attempting to create fresh database..."
  npx prisma migrate deploy --create-only 2>&1 || true
  npx prisma migrate deploy 2>&1
}
echo "✓ Migrations applied"

# ── 2. Seed database if empty ───────────────────────────────────────────
# Only seed if the Provider table has 0 rows (first boot)
PROVIDER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.provider.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$PROVIDER_COUNT" = "0" ]; then
  echo "→ First boot detected — seeding demo data..."
  npx tsx scripts/seed.ts 2>&1 || echo "⚠ Seeding failed (non-fatal, app will still start)"
  echo "✓ Seed complete"
else
  echo "→ Database already seeded ($PROVIDER_COUNT providers found)"
fi

# ── 3. Start Next.js ────────────────────────────────────────────────────
echo ""
echo "🚀 Starting SatsRouter on port ${PORT:-3000}..."
exec node server.js
