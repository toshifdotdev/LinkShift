# LinkShift — AWS Production Deployment (EC2 + Docker + Caddy)

This document describes the initial single-EC2 production deployment for
LinkShift. It is based on the actual repository: `backend/Dockerfile`,
`backend/.dockerignore`, `deploy/docker-compose.yml`, and `deploy/Caddyfile`.

```
                       ┌──────────────────────────────────────────────┐
 https://linkshift.in  │  CloudFront + S3 (static React/Vite build)   │
          ────────────►│  SPA served as static files                  │
                       └──────────────────────────────────────────────┘

                       ┌──────────────────────────────────────────────┐
https://go.linkshift.in ──► Caddy :443 ──► app container :3000           │
        (DNS A/AAAA)   │  automatic Let's Encrypt  └─ dist/server.js   │
                       │  certificates + renewal      Node.js 22       │
                       │  EC2 (Docker)                                 │
                       └──────────┬───────────────────────────────────┘
                                  │ runtime env vars only
                 ┌────────────────┼─────────────────────┬──────────────┐
                 ▼                ▼                     ▼              ▼
            Neon PostgreSQL   Upstash Redis      Cloudinary     Razorpay ·
            (DATABASE_URL,    (REDIS_URL)        (avatars,      Resend ·
             DIRECT_URL)                         QR images)     Google OAuth
```

The application is **stateless at runtime**: the container holds no database,
no Redis, and writes nothing to local disk. All state lives in Neon, Upstash,
and Cloudinary. The container can be destroyed and replaced at any time.

---

## 1. What the Docker image contains

Built from `backend/Dockerfile` (multi-stage):

- **Build stage** (`node:22-slim`): `npm ci` (all deps), `prisma generate`
  (Prisma 7 TS client → `src/generated/prisma`), `tsc -b` → `dist/`.
- **Runtime stage** (`node:22-slim`): production dependencies only
  (`npm ci --omit=dev` — includes the Prisma CLI, which is a runtime
  dependency of this repo), then only:
  - `dist/` — the compiled JavaScript application (`dist/server.js` +
    `dist/generated/prisma` client)
  - `prisma/` — schema + migrations, so the *same image* can run a documented
    one-off migration (nothing runs automatically at container start)
  - `prisma.config.ts` — Prisma CLI configuration (`DIRECT_URL` for
    migrations, seed definition)
  - `GeoLite2-City.mmdb` — the GeoIP database loaded at startup from
    `process.cwd()` (`src/utils/geoIp.ts`)
- Runs as the non-root `node` user. `EXPOSE 3000`, `CMD ["node", "dist/server.js"]`,
  built-in `HEALTHCHECK` hitting `/health` (honors `$PORT`).

## 2. What the image does NOT contain

- **No `.env` files, no credentials, no secrets of any kind.**
  `backend/.dockerignore` blocks `.env` / `.env.*` / keys from even entering
  the build context, and the Dockerfile only `COPY`s explicit paths
  (`package*.json`, `prisma.config.ts`, `prisma/`, `src/`, `tsconfig.json`,
  `GeoLite2-City.mmdb`, `dist`).
- No dev dependencies (`typescript`, `vitest`, `tsx`, `supertest`, `@types/*`),
  no tests, no git metadata, no local build leftovers.
- No local PostgreSQL/Redis — those are external (Neon/Upstash).

## 3. Why secrets are supplied at runtime

One image must be able to serve any environment (staging, production) purely
by changing environment variables. `backend/src/config/env.ts` reads
`process.env` at startup (the `dotenv.config()` call is a no-op when no `.env`
file exists in the container, so plain environment variables win). Secrets are
injected on the EC2 host by `docker compose`'s `env_file: .env`
(`deploy/.env`, gitignored). Rotating a secret = edit host `.env` +
`docker compose up -d` — never a rebuild.

## 4. What `dist/` is

`dist/` is the TypeScript compilation output of `backend/src` (`tsc -b`):
`dist/server.js` is the production entry point (`npm start`), and
`dist/generated/prisma` is the compiled Prisma 7 client (generated as
TypeScript into `src/generated/prisma` by `prisma generate`, then compiled
with the app). The container runs `node dist/server.js` — never a dev server.

## 5. How the container starts

1. `docker compose up -d` pulls `APP_IMAGE` from Docker Hub (already pulled → cached).
2. The app container starts with the runtime env (compose `env_file`).
3. `node dist/server.js`: loads config from env, opens the pg pool
   (Neon), fire-and-forget connects Redis (Upstash — degrades gracefully if
   unreachable), listens on `$PORT` (default 3000, internal only).
4. Caddy (started alongside) reverse-proxies `https://go.linkshift.in` →
   `app:3000`.
5. The Docker/compose `HEALTHCHECK` polls `/health`: 200 = healthy, 503
   (database down) = unhealthy. `docker compose ps` shows the state.
6. `docker stop` sends SIGTERM → the app drains in-flight requests, closes
   Prisma + Redis, force-exits after 10 s (`backend/src/server.ts`).

## 6. How Caddy provides HTTPS

`deploy/Caddyfile` declares `go.linkshift.in { reverse_proxy app:3000 }`.
Caddy obtains a Let's Encrypt certificate automatically via the HTTP-01
challenge (port 80 is published), serves TLS on 443, HTTP-redirects 80→443,
and renews certificates before expiry. Certificates persist in the
`caddy_data` volume so restarts never re-challenge. This is why Caddy
replaces Nginx + Certbot initially: one file, automatic TLS, zero cert
tooling. Caddy runs as its own container — it is **not** part of the app
image.

## 7. Docker Hub flow (source → image → EC2)

```
backend/ source
  → docker build  (backend/Dockerfile)
  → Docker image (<DOCKER_HUB_USERNAME>/linkshift-backend:<tag>)
  → push to Docker Hub
  → EC2 pulls the image (docker compose pull)
  → docker compose up -d  (container runs with runtime env)
```

Image naming convention: `docker.io/<DOCKER_HUB_USERNAME>/linkshift-backend:<tag>`
(`DOCKER_HUB_USERNAME` is a placeholder — your Docker Hub account; tags are
usually `v1`, `v2`, … or the git sha).

Exact commands (run where Docker is available, e.g. CI or a build machine —
**not** necessarily the EC2 box):

```bash
TAG=v1   # or git sha

docker login   # Docker Hub — use an access token, not your password
docker build --platform linux/amd64 -t $DOCKER_HUB_USERNAME/linkshift-backend:$TAG backend/
docker push $DOCKER_HUB_USERNAME/linkshift-backend:$TAG
```

On the EC2 host (`deploy/` directory, `.env` prepared with
`APP_IMAGE=$DOCKER_HUB_USERNAME/linkshift-backend:$TAG`):

```bash
docker login   # only required if the Docker Hub repository is private
sudo docker compose pull
sudo docker compose up -d
```

The compose stack is registry-agnostic: `APP_IMAGE` accepts any registry URI,
so Amazon ECR (or GitHub GHCR) can replace Docker Hub later without changing
anything but the image reference.

**Image platform**: build with `--platform linux/amd64` for an x86_64 EC2
instance (see §14). The Dockerfile itself is arch-neutral.

## 8. Prisma migrations (documented, never automatic)

Migrations are **not** run at container startup — deploy order is:
**migrate first, then start the new image.**

The `prisma` CLI ships inside the image (runtime dependency), and the image
contains `prisma/` + `prisma.config.ts`, whose datasource uses
`DIRECT_URL` (falling back to `DATABASE_URL`) — the direct (non-pooled)
Neon endpoint required by migrations. Run from the EC2 host:

```bash
cd deploy
sudo docker compose run --rm app npx prisma migrate deploy
```

The seed (`npx prisma db seed`, defined in `prisma.config.ts`) is **idempotent**
(upserts only: 4 plans + the shared `go.linkshift.in` domain) and is run once
against a fresh environment, then only when plan data changes:

```bash
sudo docker compose run --rm app npx prisma db seed
```

First production bring-up order: `migrate deploy` → `db seed` → `up -d`.

## 9. Deploying a new version / rolling back

**Deploy**: push the new tag to Docker Hub → on EC2 update `APP_IMAGE` in `.env`
(or pass it inline) → `docker compose pull && docker compose up -d`.
The app swap is a container replace; Caddy keeps serving and the health
check gates `docker compose ps` visibility. Downtime is limited to the
container handoff (seconds); run migrations that are backward-compatible
so the old image tolerates the new schema during the swap.

**Rollback**: point `APP_IMAGE` back to the previous tag (every pushed tag
stays in Docker Hub) → `docker compose up -d`. If a migration must be reversed,
restore from Neon's point-in-time backup / apply a down script manually —
`prisma migrate deploy` never rolls back automatically.

## 10. Data that must never live on the host

Nothing on the EC2 filesystem is state: no uploads (Cloudinary), no sessions
(Neon), no cache (Upstash), no certificates that matter long-term except
Caddy's (`caddy_data` volume — back it up or let it re-issue). The only
host files are the compose stack, `Caddyfile`, and `.env` (secrets — back it
up securely, never commit it).

Two operational notes:
- **GeoLite2** (`GeoLite2-City.mmdb`, baked into the image) enriches scan
  analytics with country/city; the app degrades gracefully to "unknown
  location" if it is missing. Keeping it current is a periodic operational
  responsibility — refresh it from MaxMind (license required) and rebuild the
  image; check the MaxMind EULA covers your redistribution before publishing
  the image anywhere beyond your own registry.
- **Scaling**: the stack is sized for one backend container; rate limiting is
  in-process. Before running multiple app containers, move the express-rate-limit
  counters to the shared Redis store.

## 11. ARM64 vs x86_64 findings

- **Prisma 7** uses the new `prisma-client` generator (TS queryCompiler
  client) + `@prisma/adapter-pg` — **no native query engine**, so there is no
  Prisma binary/`binaryTargets`/OpenSSL concern at all.
- **bcrypt@6**: native addon; ships prebuilt N-API binaries for glibc
  (linux-x64 **and** linux-arm64) — **no musl/Alpine prebuilds**.
- **sharp@0.35**: native; official prebuilds for x64 + arm64, glibc + musl.
- Everything else is pure JavaScript.

Conclusion: the image is safe on **both x86_64 and ARM64 (Graviton)** when
built on **Debian slim** (glibc). Alpine/musl is the only real trap (bcrypt
would need a source build with a full toolchain) — which is why the
Dockerfile uses `node:22-slim`. **Safest initial EC2 choice: x86_64
(`t3.small`)** for maximum ecosystem maturity; Graviton (`t4g.small`, ~20%
cheaper) is a low-risk switch later since every native dependency has arm64
glibc prebuilds. Always build/push with `--platform linux/amd64` (or `arm64`
deliberately) so the image architecture matches the instance.

## 12. Frontend (separate from this stack)

`frontend/` builds to static files (`npm run build` → `dist/`, incl. the
generated `sitemap.xml`, `llms.txt`, and **per-route prerendered HTML** —
`dist/<route>/index.html` for every public route, so crawlers and AI agents
receive real page content without executing JavaScript). Build once with
`VITE_API_URL=https://go.linkshift.in/api/v1`, upload `dist/` to S3, serve
via CloudFront. The distribution must map clean URLs to their files with an
SPA fallback, e.g. a CloudFront function that rewrites
`/<route>` → `/<route>/index.html` when no asset matches, falling back to
`/index.html` for unknown paths (keeps client-side routing working). Not part
of the EC2/Caddy stack.

## 13. Reconciliation (hourly)

`POST /api/v1/internal/reconciliation/run` (header `x-recon-secret`) should
be triggered hourly by **EventBridge Scheduler → API Destination** after
launch; the connection secret lives in Secrets Manager. Until then it can be
curl'd manually from the EC2 box. Missed runs self-heal via the
reconciliation job's own single-run guarantee; the endpoint is fail-closed.

## 14. Remaining manual AWS configuration (checklist)

1. EC2 instance (t3.small, Ubuntu 24.04 or Amazon Linux 2023) + Docker +
   docker-compose-plugin installed.
2. Security group: inbound 80/443 only (SSH restricted); no inbound 3000 —
   the app is internal to the compose network.
3. Docker Hub repository `<DOCKER_HUB_USERNAME>/linkshift-backend` (private
   works; a private repo needs `docker login` on the EC2 host — an access
   token stored in a protected file, never committed).
4. Neon project (paid plan, auto-suspend disabled) → `DATABASE_URL` (pooled)
   + `DIRECT_URL` (direct).
5. Upstash Redis (Pay-as-You-Go, TLS endpoint) → `REDIS_URL`
   (`rediss://…`, not the REST URL).
6. SSM/secure storage for the secret values; local `deploy/.env` filled from
   `backend/.env.example` with production values
   (`NODE_ENV=production`, `TRUST_PROXY_HOPS=1` behind Caddy,
   `APP_URL=https://go.linkshift.in`, `FRONTEND_URL=https://linkshift.in`,
   `CORS_ORIGINS=https://linkshift.in`).
7. DNS: `go.linkshift.in` A/AAAA → EC2 public IP (elastic IP recommended);
   `linkshift.in`/`www` → CloudFront (separate workstream).
8. Cloudinary production account keys.
9. Razorpay: live keys + webhook `https://go.linkshift.in/api/v1/billing/webhook`
   + plan IDs (blocked on account conversion).
10. Google OAuth: production client + redirect
    `https://go.linkshift.in/api/v1/auth/google/callback`.
11. Resend: verified domain sender (`EMAIL_FROM`) + production key.
12. EventBridge Scheduler for reconciliation (post-launch ok, recommended day one).
13. CloudWatch agent (optional initially — journald/docker logs suffice at start).
