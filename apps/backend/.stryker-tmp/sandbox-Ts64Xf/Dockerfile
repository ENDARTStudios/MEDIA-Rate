# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/core-domain/package.json packages/core-domain/
COPY packages/core-ports/package.json packages/core-ports/
COPY packages/core-errors/package.json packages/core-errors/
COPY packages/core-result/package.json packages/core-result/
COPY packages/core-config/package.json packages/core-config/
COPY packages/core-events/package.json packages/core-events/
COPY packages/core-testing/package.json packages/core-testing/
COPY apps/backend/package.json apps/backend/
RUN npm install --workspaces --if-present
COPY . .
RUN npm -w apps/backend run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json .
COPY --from=builder /app/apps/backend/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
