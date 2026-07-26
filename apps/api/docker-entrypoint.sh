#!/bin/sh
set -eu
cd /app
echo "[entrypoint] running prisma migrate deploy"
npx prisma migrate deploy --schema=prisma/schema.prisma
echo "[entrypoint] starting node"
exec node dist/main.js
