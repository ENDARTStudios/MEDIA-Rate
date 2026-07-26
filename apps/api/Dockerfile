# MEDIA Rate — Backend Dockerfile (T026/9.1.4)
# Multi-stage build com prune de dependências de desenvolvimento.
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia arquivos de dependência do monorepo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/ 2>/dev/null || true

# Instala apenas deps de produção para o workspace da API
RUN npm ci --workspace=apps/api --include-workspace-root

# Copia código fonte
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/prisma/ ./apps/api/prisma/
COPY packages/ ./packages/

# Gera Prisma client
RUN cd apps/api && npx prisma generate

# Build TypeScript
RUN cd apps/api && npm run build

# Stage 2: Produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copia apenas artefatos de produção
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
