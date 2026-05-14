# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Native build tools required by better-sqlite3
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove dev-only packages to slim the node_modules
RUN npm prune --omit=dev

# ── Stage 2: Production runner ────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what the server needs to run
COPY --from=builder --chown=nextjs:nodejs /app/.next        ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public       ./public

# Writable data directory for SQLite DB and uploaded files
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
