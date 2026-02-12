# syntax=docker/dockerfile:1

# Web Service Dockerfile
# Multi-stage build for TanStack Start application
# Uses Bun for build, serves with nginx

# ==========================================
# Stage 1: Base - Setup common dependencies
# ==========================================
FROM oven/bun:1-alpine AS base

# Install necessary build dependencies
RUN apk add --no-cache \
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

# Prune the monorepo to only include Web and its dependencies
RUN turbo prune --scope=@repo/web --docker

# ==========================================
# Stage 3: Installer - Install dependencies
# ==========================================
FROM base AS installer

# Copy pruned package.json files
COPY --from=pruner /app/out/json/ .

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ==========================================
# Stage 4: Builder - Build the application
# ==========================================
FROM base AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy installed dependencies
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=installer /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy full source code
COPY --from=pruner /app/out/full/ .

# Build the shared package first (dependency of Web)
RUN cd packages/shared && bun run build || echo "No build script, skipping"

# Build the Web application
RUN cd apps/web && bun run build

# ==========================================
# Stage 5: Runner - Production runtime with nginx
# ==========================================
FROM nginx:1.25-alpine AS runner

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
RUN echo 'server { \
    listen 3000; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
    \
    # Cache static assets \
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Handle client-side routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "healthy\\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
