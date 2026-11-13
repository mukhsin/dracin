#!/bin/sh
# Entrypoint script for API container
# Applies migrations, verifies the schema, then starts the server

set -e

# Single source of truth for the database location.
# Both drizzle.config.ts and the runtime read DATABASE_URL. Without it the
# migrator defaults to file:/data/dracin.sqlite while the runtime falls back to
# file:./.data/dracin.db, so migrations and queries would hit different files.
export DATABASE_URL="${DATABASE_URL:-file:/data/dracin.sqlite}"

echo "🗄️  DATABASE_URL=${DATABASE_URL}"

# Make sure the parent directory of a local SQLite file exists.
case "$DATABASE_URL" in
    file:*)
        db_path="${DATABASE_URL#file:}"
        case "$db_path" in
            "" | :memory:*) ;;
            *) mkdir -p "$(dirname "$db_path")" ;;
        esac
        ;;
esac

cd /app/apps/api

echo "🔧 Running database migrations..."
if bunx drizzle-kit migrate --config ./drizzle.config.ts; then
    echo "✅ drizzle-kit migrate completed"
else
    echo "⚠️  drizzle-kit migrate failed - falling back to idempotent repair"
fi

# Always converge the schema. drizzle-kit silently skips migrations whose
# journal "when" timestamp is older than the last applied one (0004-0007 in
# this repo are older than 0003), so this idempotent pass keeps every
# environment consistent regardless of migration bookkeeping.
echo "🔧 Verifying schema..."
if ! bun run scripts/repair-migrations.ts; then
    echo "🚨 Schema verification failed"
    exit 1
fi

echo "🚀 Starting API server..."
exec bun run ./dist/index.js
