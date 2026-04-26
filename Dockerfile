# ── Stage 1: Dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install native build tools (needed by better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files AND prisma schema BEFORE npm ci
# (postinstall runs "prisma generate" which needs schema.prisma)
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Bring node_modules (including generated Prisma client) from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Re-generate Prisma client targeting the builder's Linux environment
RUN npx prisma generate --schema=prisma/schema.prisma

# Build Next.js standalone bundle
# Dummy DATABASE_URL so the build succeeds without a real DB
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:/tmp/build.db"

RUN npx next build

# ── Stage 3: Production Runner ─────────────────────────────────────────
FROM node:20-alpine AS runner

# Need build tools for better-sqlite3 native bindings
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── Next.js standalone output ──
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# public/ may be empty — create first so COPY never fails on a missing dir
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# ── Prisma schema + migrations + config (all required for migrate deploy) ──
# Prisma 7.x reads DATABASE_URL from prisma.config.ts, not schema.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# ── Seed script ──
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# ── package.json + lock (so npm install can resolve versions) ──
COPY package.json package-lock.json ./

# Install runtime-only tools as root (before USER switch).
# prisma/ is already copied above so postinstall (prisma generate) can find the schema.
# Do NOT use --ignore-scripts: @prisma/client's postinstall generates required WASM files.
RUN npm install \
    prisma \
    tsx \
    dotenv \
    @prisma/client \
    @prisma/adapter-better-sqlite3 \
    better-sqlite3

# ── Entrypoint script ──
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# ── Persistent SQLite data directory ──
# Mount a DigitalOcean Volume (or docker volume) here to survive redeploys
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

ENV DATABASE_URL="file:/app/data/satsrouter.db"

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
