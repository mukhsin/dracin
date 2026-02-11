#!/usr/bin/env bash
set -euo pipefail

REGISTRY="ghcr.io/mukhsin"
TAG="latest"

echo "Logging in to ${REGISTRY} (if needed)..."
docker login "ghcr.io"

echo "Setting up buildx builder..."
docker buildx create --use --name dracin-remote 2>/dev/null || docker buildx use dracin-remote

echo "Building and pushing amd64 images (one-by-one)..."
docker buildx build --platform linux/amd64 -t "${REGISTRY}/dracin-api:${TAG}" -f apps/api/Dockerfile . --push
docker buildx build --platform linux/amd64 -t "${REGISTRY}/dracin-web:${TAG}" -f apps/web/Dockerfile . --push
docker buildx build --platform linux/amd64 -t "${REGISTRY}/dracin-api-proxy:${TAG}" -f apps/api-proxy/Dockerfile . --push

echo "Done."
