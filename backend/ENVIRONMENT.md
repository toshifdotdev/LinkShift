# LinkShift Backend — Environment & Deployment Matrix

Canonical template: [`backend/.env.example`](./.env.example). Fill real values
in `.env` (dev, gitignored) or your platform's secret store (production).

## Variable matrix

| Variable | Dev (local) | Production | Notes |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | |
| `PORT` | `3000` | platform-assigned / 3000 | |
| `APP_URL` | `http://localhost:3000` | `https://api.linkshift.in` | Backend origin; base for email verification links |
| `DATABASE_URL` | Neon **pooled** (`-pooler` host) | Neon **pooled** | App runtime pool (`src/config/prisma.ts`) |
| `DIRECT_URL` | Neon **direct** (no `-pooler`) | Neon **direct** | Prisma CLI/migrations only (`prisma.config.ts`) |
| `DATABASE_POOL_MAX` | `10` | `5–10` | PgBouncer multiplies this per instance |
| `DB_CONNECT_TIMEOUT_MS` | `10000` | `10000` | Fail-fast during network blips (Neon M-fix) |
| `JWT_SECRET` | dev value OK | **long random secret (rotate)** | HS256 access tokens |
| `GOOGLE_CLIENT_ID/SECRET` | test OAuth app | production OAuth app | Authorized redirect must equal `GOOGLE_CALLBACK_URL` |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/v1/auth/google/callback` | `https://api.linkshift.in/api/v1/auth/google/callback` | Full backend path |
| `FRONTEND_URL` | `http://localhost:5173` | `https://linkshift.in` | SPA origin — email reset links + verify redirect. **Never** the OAuth callback path (M1 fix). Also the default CORS-allowed origin (see `CORS_ORIGINS`) |
| `CORS_ORIGINS` | unset (falls back to `FRONTEND_URL`) | unset unless multiple origins need API access (e.g. staging + prod) | Comma-separated list of allowed CORS origins for `app.ts`; set only when one origin isn't enough |
| `RESEND_API_KEY` | test key | production key |
| `EMAIL_FROM` | `onboarding@resend.dev` (dev) | **verified domain sender**, e.g. `noreply@linkshift.in` — Resend blocks unverified senders for third-party recipients; hard requirement at deploy | |
| `CLOUDINARY_*` | dev account | prod account | |
| `RAZORPAY_KEY_ID/SECRET` | `rzp_test_…` | `rzp_live_…` | Keys and webhook secret are account-scoped |
| `RAZORPAY_WEBHOOK_SECRET` | dashboard webhook config | same, per environment | |
| `RECON_SECRET` | any 64-hex (local curl) | strong random; store in scheduler secret | `x-recon-secret` header on `/api/v1/internal/reconciliation/run` |
| `SCAN_IP_PRIVACY` | `truncated` (default) | `truncated` recommended | `full` stores exact IPs — only with a documented need |
| `TRUST_PROXY_HOPS` | `0` local · `1` when testing via ngrok | `1` behind one LB/nginx · `2` behind Cloudflare + nginx | **Never** `true`. Wrong-high reopens IP spoofing |

## Reverse-proxy guidance

- One trusted layer (PaaS LB or nginx): `TRUST_PROXY_HOPS=1`.
- Cloudflare in front of nginx: `=2`.
- The proxy must SET or APPEND `X-Forwarded-For`; Express resolves `req.ip`
  from the first untrusted hop rightward.

## Reconciliation scheduling

Dev/test: manual `curl -X POST -H "x-recon-secret: …" $APP_URL/api/v1/internal/reconciliation/run`.

Production (hourly, per D-C): point any external scheduler at the endpoint
with the header. Recommended cadence: hourly. Single-runner safety is
enforced by the `ReconciliationRun` partial unique index — concurrent
triggers are safe.

## CI

GitHub Actions (`.github/workflows/ci.yml`): forced full typecheck/build +
hermetic unit suite on every push/PR. Integration suite requires a reachable
database and stays local/manual by design.
