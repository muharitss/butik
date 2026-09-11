# Multi-stage Dockerfile for JahitFlow Backend

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and application source
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled files and Prisma artifacts from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Security: Run as non-privileged user
USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
