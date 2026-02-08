#!/bin/bash

# Script to run Hono route matching tests
# Navigate to project root first: cd /path/to/your/project

echo "=== Hono Route Matching Test Runner ==="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "turbo.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Running tests..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; .then
    echo "📦 Installing dependencies..."
    bun install
fi

# Change to the test directory
cd .sisyphus/notepads/url-shortening-with-cache-validation

echo "🧪 Running minimal reproduction test..."
bun run minimal-reproduction.test.ts

echo "🧪 Running route matching behavior test..."  
bun run route-matching-behavior.test.ts

echo "🧪 Running integration test..."
bun run route-matching-integration.test.ts

echo "✅ All tests completed!"
