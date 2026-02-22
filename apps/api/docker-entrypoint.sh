#!/bin/sh
# Entrypoint script for API container
# Runs migrations and starts the server

set -e

echo "🔧 Running database migrations..."
cd /app/apps/api

# Run drizzle-kit migrate with better error handling
if bunx drizzle-kit migrate --config ./drizzle.config.ts; then
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migration failed or skipped, checking database state..."
    
    # Check if critical tables exist
    if ! bun run -e "
        import { createClient } from '@libsql/client';
        const client = createClient({ url: process.env.DATABASE_URL || 'file:/data/dracin.sqlite' });
        const result = await client.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='drama_lists'\");
        if (result.rows.length === 0) {
            console.log('❌ drama_lists table missing, running repair...');
            process.exit(1);
        }
        console.log('✅ Database appears valid');
        await client.close();
    " 2>/dev/null; then
        echo "🚨 Database tables missing! Running emergency repair..."
        bun run scripts/repair-migrations.ts
    fi
fi

echo "🚀 Starting API server..."
exec bun run ./dist/index.js
