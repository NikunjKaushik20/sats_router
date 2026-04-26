# ── Stage 1: Dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone mode)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide dummy env vars so the build doesn't fail on missing secrets
# (they're injected at runtime via docker-compose or DO App Platform)
ENV DATABASE_URL="file:./dev.db"

RUN npx next build

# ── Stage 3: Production Runner ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (schema, migrations, generated client)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy seed script + helpers
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Install only the runtime deps needed for seeding & Prisma CLI
# (tsx for seed script, prisma for migrations, dotenv for env loading)
RUN npm install --no-save prisma tsx dotenv @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3

# Copy the entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory for SQLite (persistent volume mount point)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# The SQLite DB will live at /app/data/satsrouter.db
# Map DATABASE_URL to this path in docker-compose
ENV DATABASE_URL="file:/app/data/satsrouter.db"

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
