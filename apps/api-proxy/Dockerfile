# syntax=docker/dockerfile:1

FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl openssl \
    && groupadd -r nodejs 2>/dev/null || true \
    && id -u proxy >/dev/null 2>&1 || useradd -r -g nodejs proxy

COPY apps/api-proxy/package.json ./package.json

RUN npm install --production

COPY apps/api-proxy/ ./

ENV NODE_ENV=production
ENV PORT=3002

USER proxy

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f "http://localhost:${PORT}/" || exit 1

CMD ["node", "index.js"]
