#!/usr/bin/env bash
set -euo pipefail

REGISTRY="ghcr.io/mukhsin"
TAG="latest"

echo "Logging in to ${REGISTRY} (if needed)..."
docker login "ghcr.io"

echo "Building and pushing multi-arch images..."
docker buildx create --use --name dracin-multiarch 2>/dev/null || docker buildx use dracin-multiarch
docker buildx build --platform linux/amd64,linux/arm64 -t "${REGISTRY}/dracin-api:${TAG}" -f apps/api/Dockerfile . --push
docker buildx build --platform linux/amd64,linux/arm64 -t "${REGISTRY}/dracin-web:${TAG}" -f apps/web/Dockerfile . --push
docker buildx build --platform linux/amd64,linux/arm64 -t "${REGISTRY}/dracin-api-proxy:${TAG}" -f apps/api-proxy/Dockerfile . --push

echo "Done."

# docker buildx rm dracin-remote
