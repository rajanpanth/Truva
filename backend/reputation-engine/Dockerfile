# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

COPY backend/reputation-engine/package.json backend/reputation-engine/package-lock.json backend/reputation-engine/tsconfig.json ./
RUN npm ci --ignore-scripts

COPY backend/reputation-engine/src/ ./src/
RUN npx tsc --outDir dist
# Copy SQL migration files (not compiled by tsc) into dist
RUN mkdir -p dist/db/migrations && cp src/db/migrations/*.sql dist/db/migrations/

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Only install production deps
COPY backend/reputation-engine/package.json backend/reputation-engine/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /build/dist ./dist

EXPOSE 3001

# Run as non-root
USER node

CMD ["node", "dist/index.js"]
