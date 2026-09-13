# syntax=docker/dockerfile:1
# ============ BUILD ============
FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app

# 1) deps: raiz + workspace api. SEM packages/ (nao existe no repo).
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace=apps/api

# T451 (incidente P0 de deploy): o workspace api fixa sharp@0.35.4, enquanto
# apps/web traz sharp@0.35.3 (peer opcional do Next). O conflito faz o npm
# ANINHAR sharp em apps/api/node_modules em vez de hoistar. O dist roda de
# /app/dist e resolve modulos a partir de /app/node_modules -> o sharp aninhado
# precisa ser mesclado na raiz; sem isso o boot crasha no import de variants.js
# (ERR_MODULE_NOT_FOUND: Cannot find package 'sharp') e o healthcheck do Railway
# falha. Condicional para nao quebrar caso o npm volte a hoistar sozinho.
RUN if [ -d apps/api/node_modules ]; then cp -a apps/api/node_modules/. node_modules/; fi

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
