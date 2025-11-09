#!/bin/bash
set -e

echo "Seeding CRM Atlas database..."

# Build seed script
pnpm build

# Run seed script
node -r ts-node/register scripts/seed.ts

echo "✅ Seeding completed!"


