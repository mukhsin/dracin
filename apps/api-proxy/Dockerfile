# syntax=docker/dockerfile:1

FROM oven/bun:1.3.4-debian

WORKDIR /app

RUN apt-get update && apt-get install -y curl openssl \
    && groupadd -r bunjs && useradd -r -g bunjs proxy

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
