# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
RUN npx tsc --outDir dist

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Only install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /build/dist ./dist

EXPOSE 3001

# Run as non-root
USER node

CMD ["node", "dist/index.js"]
