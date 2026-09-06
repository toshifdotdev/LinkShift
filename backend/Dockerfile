# syntax=docker/dockerfile:1
# ============================================================================
# LinkShift backend — production image
#
# Multi-stage: build (full deps + TypeScript) → runtime (prod deps only).
# Secrets are NEVER copied: no .env files, no credentials. All configuration
# is injected at container runtime (compose env_file / ECS task env).
#
# Base image: node:22-slim (Debian glibc). Deliberately NOT alpine/musl —
# bcrypt@6 ships prebuilt binaries for glibc (x64 + arm64) but not musl.
# Prisma 7 uses the TS queryCompiler client + @prisma/adapter-pg (pure JS):
# no native query engine, no system OpenSSL dependency. sharp ships prebuilds
# for both architectures. → The image builds and runs on x86_64 AND arm64.
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1 — build: install all deps, generate the Prisma client, compile TS.
# ----------------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# Lockfile-driven install (dev deps included: typescript is required for the
# production build). @prisma/engines postinstall fetches the platform schema
# engine used by `prisma migrate` — network access is expected during build.
COPY package.json package-lock.json ./
RUN npm ci

# Application sources. src/generated (locally generated Prisma client) is
# excluded via .dockerignore and regenerated here, so the image never ships
# stale host-specific output.
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# prisma generate → src/generated/prisma (TS client, queryCompiler);
# tsc -b      → dist/ (compiled application incl. dist/generated/prisma).
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2 — runtime: production dependencies only, non-root, no secrets.
# ----------------------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
# Production dependencies only. `prisma` is a runtime dependency of this repo,
# so the CLI stays available for documented one-off migrations
# (`docker compose run --rm app npx prisma migrate deploy`) — nothing runs
# migrations automatically at container start.
RUN npm ci --omit=dev && npm cache clean --force

# Compiled application (dist/server.js + dist/generated/prisma client).
COPY --from=build /app/dist ./dist

# Prisma schema + migrations + config, so the same image can run
# `npx prisma migrate deploy` against the runtime DATABASE_URL/DIRECT_URL.
COPY prisma ./prisma
COPY prisma.config.ts ./

# GeoIP database — loaded at startup from process.cwd()
# (src/utils/geoIp.ts: path.join(process.cwd(), "GeoLite2-City.mmdb")).
COPY GeoLite2-City.mmdb ./

# The app never writes to local disk at runtime (uploads go to Cloudinary,
# state lives in Neon/Upstash), so the non-root node user only needs read
# access to /app.
USER node

EXPOSE 3000

# 200 → healthy; 503 (database down) → unhealthy. Honors the runtime PORT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
