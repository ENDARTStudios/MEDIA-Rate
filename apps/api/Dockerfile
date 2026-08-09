# syntax=docker/dockerfile:1
# ============ BUILD ============
FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app

# 1) deps: raiz + workspace api. SEM packages/ (nao existe no repo).
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace=apps/api

# 2) Prisma Client (npm ci nao roda generate sem postinstall; gerar aqui)
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# 3) codigo + build (gera dist/)
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./
RUN npm run build --workspace=apps/api

# ============ RUNNER ============
FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# NON-ROOT: a imagem node:20-alpine JA traz o usuario `node` (uid 1000).
# PROIBIDO usar addgroup/adduser — crasha no runc do Railway.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./
COPY --from=builder --chown=node:node /app/apps/api/prisma ./prisma
# T224: seeds rodam via @swc-node/register (ESM), que exige tsconfig.json
# no cwd para mapear imports relativos .js -> .ts (ex.: ./seed-lib.js).
# tsconfig.base.json nao existe na imagem -> usar versao flat standalone.
COPY --from=builder --chown=node:node /app/apps/api/tsconfig.seeds.json /app/tsconfig.json
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=25s \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Entrypoint via script executavel — deterministico, sem parsing de aspas/cd.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
