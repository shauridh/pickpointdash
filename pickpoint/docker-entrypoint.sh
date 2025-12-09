#!/bin/sh
set -e

# This entrypoint runs Prisma migrations and optional seed before starting the app.
# It expects DATABASE_URL to be provided via environment variables in Coolify.

echo "==> Running entrypoint: checking environment"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Exiting." >&2
  exit 1
fi

echo "DATABASE_URL set. Running Prisma migrate deploy..."

# Run migrations
npx prisma migrate deploy
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "Prisma migrate deploy failed with exit code $MIGRATE_EXIT" >&2
  exit $MIGRATE_EXIT
fi

# Run seed only if RUN_SEED env var is "true" (default: false)
if [ "$RUN_SEED" = "true" ]; then
  echo "RUN_SEED=true — running seed script"
  # If your seed is JS: node prisma/seed.js or npm run seed (adjust if needed)
  if [ -f ./prisma/seed.js ]; then
    node prisma/seed.js
  elif [ -f ./prisma/seed.ts ]; then
    # If seed is TypeScript and ts-node available
    npx ts-node prisma/seed.ts
  else
    # Try npm script 'seed' if defined
    if npm run | grep -q "seed"; then
      npm run seed
    else
      echo "No recognizable seed script found; skipping seed.";
    fi
  fi
else
  echo "RUN_SEED not set to 'true' — skipping seed step"
fi

# Finally exec the original CMD
echo "Starting application"
exec "$@"
