# ============================================================
# SilkRoad Africa — Dockerfile for Cloud Run
# Node 20 Alpine, Next.js standalone output
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies (all, including dev — needed for Next.js build) ──────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm install

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use standalone output for minimal image size
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build-time public env vars — must be passed via --build-arg on every build.
# These are baked into the JS bundle; a build without them produces a broken app.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build
RUN npm run build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# next-intl v4 resolves locale message files at runtime from the project root.
# Without this copy every page throws "Cannot find module '…/messages/en.json'"
# and returns a 500 — even though local dev works (files are on disk there).
COPY --from=builder /app/messages ./messages

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
