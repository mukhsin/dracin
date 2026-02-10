# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache curl && addgroup -S bunjs && adduser -S proxy -G bunjs

COPY apps/api-proxy/package.json ./package.json

RUN bun install --production

COPY apps/api-proxy/ ./

ENV NODE_ENV=production
ENV PORT=3002

USER proxy

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f "http://localhost:${PORT}/" || exit 1

CMD ["bun", "index.js"]
