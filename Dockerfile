# --- Builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY data.json ./data.json

# Build TypeScript
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only runtime files
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
# Copy initial data file (can be overridden via volume)
COPY --from=builder /app/data.json ./data.json

# Expose Mini App HTTP port
EXPOSE 3000

# Default command runs the Mini App server. For bot, override in compose.
CMD ["node", "dist/server.js"]
