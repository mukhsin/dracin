# syntax=docker/dockerfile:1

# API Service Dockerfile
# Multi-stage build for optimized production image
# Uses Bun runtime with PostgreSQL support

# ==========================================
# Stage 1: Base - Setup common dependencies
# ==========================================
FROM oven/bun:1-alpine AS base

# Install necessary system dependencies for PostgreSQL
RUN apk add --no-cache \
    postgresql-client \
    curl \
    ca-certificates

WORKDIR /app

# ==========================================
# Stage 2: Pruner - Turbo prune the monorepo
# ==========================================
FROM base AS pruner

# Install turbo
RUN bun install -g turbo@^2.4.0

# Copy root configuration
COPY package.json bun.lock turbo.json ./

# Copy all workspace package.json files for pruning
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Copy source code
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Prune the monorepo to only include API and its dependencies
RUN turbo prune --scope=@repo/api --docker

# ==========================================
# Stage 3: Installer - Install production dependencies
# ==========================================
FROM base AS installer

# Copy pruned package.json files
COPY --from=pruner /app/out/json/ .

# Install production dependencies
RUN bun install --frozen-lockfile --production

# ==========================================
# Stage 4: Dev Installer - Install all dependencies (including dev)
# ==========================================
FROM base AS dev-installer

# Copy pruned package.json files
COPY --from=pruner /app/out/json/ .

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ==========================================
# Stage 5: Builder - Build the application
# ==========================================
FROM base AS builder

 # Install TypeScript globally for build
RUN bun install -g typescript && \
    ln -sf $(bun pm bin -g)/tsc /usr/local/bin/tsc

# Copy all installed dependencies (including devDependencies)
COPY --from=dev-installer /app/node_modules ./node_modules
COPY --from=dev-installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dev-installer /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=pruner /app/out/full/ .

# Build the shared package first (dependency of API)
RUN cd packages/shared && bun run build || echo "No build script, skipping"

# Build the API
RUN cd apps/api && bun run build

# ==========================================
# Stage 6: Runner - Production runtime
# ==========================================
FROM oven/bun:1-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    ca-certificates \
    && addgroup -g 1001 -S bunjs \
    && adduser -S api -u 1001 -G bunjs

WORKDIR /app

RUN mkdir -p /data && chown -R api:bunjs /data

RUN bun install -g drizzle-kit@^0.31.8 && cp $(bun pm bin -g)/drizzle-kit /usr/local/bin/

# Copy production dependencies
COPY --from=installer --chown=api:bunjs /app/node_modules ./node_modules
COPY --from=installer --chown=api:bunjs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer --chown=api:bunjs /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built application
COPY --from=builder --chown=api:bunjs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api:bunjs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=api:bunjs /app/packages/shared ./packages/shared
COPY --from=builder --chown=api:bunjs /app/package.json ./

# Switch to non-root user
USER api

# Copy production dependencies
COPY --from=installer --chown=api:bunjs /app/node_modules ./node_modules
COPY --from=installer --chown=api:bunjs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer --chown=api:bunjs /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built application
COPY --from=builder --chown=api:bunjs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api:bunjs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=api:bunjs /app/packages/shared ./packages/shared
COPY --from=builder --chown=api:bunjs /app/package.json ./

# Switch to non-root user
USER api

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

CMD sh -c "cd apps/api && drizzle-kit migrate --config ./drizzle.config.ts && bun run apps/api/dist/index.js"
