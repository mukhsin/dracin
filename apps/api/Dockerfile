# syntax=docker/dockerfile:1.4

# API Service Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM oven/bun:1-alpine AS deps

RUN apk add --no-cache curl ca-certificates

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN bun install

# ==========================================
# Stage 2: Builder
# ==========================================
FROM oven/bun:1-alpine AS builder

RUN apk add --no-cache curl ca-certificates
RUN bun install -g typescript

WORKDIR /app

COPY . .

RUN bun install

RUN cd packages/shared && (bun run build || echo "No build script, skipping")
RUN cd apps/api && bun run build

# ==========================================
# Stage 3: Runner
# ==========================================
FROM oven/bun:1-alpine AS runner

RUN apk add --no-cache curl ca-certificates \
    && addgroup -g 1001 -S bunjs \
    && adduser -S api -u 1001 -G bunjs

WORKDIR /app

RUN mkdir -p /data && chown -R api:bunjs /data

COPY --from=deps --chown=api:bunjs /app/node_modules ./node_modules
COPY --from=deps --chown=api:bunjs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps --chown=api:bunjs /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=builder --chown=api:bunjs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api:bunjs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=api:bunjs /app/apps/api/drizzle.config.ts ./apps/api/
COPY --from=builder --chown=api:bunjs /app/packages/shared ./packages/shared
COPY --from=builder --chown=api:bunjs /app/package.json ./

COPY --chown=api:bunjs apps/api/drizzle ./apps/api/drizzle

USER api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

ENV NODE_ENV=production
ENV PORT=3001

CMD ["sh", "-c", "bunx drizzle-kit migrate --config ./apps/api/drizzle.config.ts && bun run ./apps/api/dist/index.js"]
