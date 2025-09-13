# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Install dependencies (including dev) and cache layer
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Build stage
FROM deps AS builder
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && npx prisma generate

# Runtime stage (keeps node_modules from deps so prisma CLI is available for migrate)
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]

