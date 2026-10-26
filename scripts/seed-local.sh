#!/usr/bin/env bash
set -e

echo "Running D1 Migrations and Seeding locally..."
npx wrangler d1 execute cutie-gallery-db --local --file=d1/migrations/0001_initial_auth.sql
npx wrangler d1 execute cutie-gallery-db --local --file=d1/migrations/0002_bookmarks.sql
npx wrangler d1 execute cutie-gallery-db --local --file=d1/migrations/0003_creators_and_media.sql
npx wrangler d1 execute cutie-gallery-db --local --file=d1/seed.sql
echo "D1 database successfully seeded!"
