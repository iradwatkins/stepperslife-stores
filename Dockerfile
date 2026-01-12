FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build (public values, safe to hardcode)
ENV NEXT_PUBLIC_CONVEX_URL=https://convex.toolboxhosting.com
ENV NEXT_PUBLIC_APP_URL=https://stepperslife.com
ENV NEXT_PUBLIC_APP_DOMAIN=stepperslife.com
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SDlY3CGiBTX8gGTC0qqcpjpSSpFRZOnwVdOFwTP5utqRbPVRw4ZMc4jyA11RfKBL4odvp0wOXw2QVFqwGHplNEl006S7oTQdD
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=AWcmEjsKDeNUzvVQJyvc3lq5n4NXsh7-sHPgGT4ZiPFo8X6csYZcElZg2wsu_xsZE22DUoXOtF3MolVK
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4BWD73WR13
ENV NEXT_PUBLIC_ENABLE_SEATING_CHARTS=true

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
