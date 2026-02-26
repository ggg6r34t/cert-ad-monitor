# CERT Ad Monitor

Monitor Meta Ad Library campaigns for impersonation, scam, and abuse signals across client brands.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui + Radix UI

## Prerequisites

- Node.js 20+
- npm 10+

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) Configure environment variables:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

See [`.env.example`](./.env.example).

- `META_AD_LIBRARY_TOKEN`: token for Meta Ad Library API calls
- `APP_ENCRYPTION_KEY`: 32-byte base64 key for encrypted server-side token storage
- `POSTGRES_URL` (or `DATABASE_URL`): recommended production datastore on Vercel
- `PG_DISABLE_TLS_VERIFY`: set `true` only for local/dev TLS troubleshooting (default secure verification)
- `DISABLE_RUNTIME_SCHEMA_INIT`: set `true` when schema is migration-managed
- `PORT` (optional): used in Docker and production runtime
- `AUTO_SCAN_ENABLED`: set `true` to enable recurring scheduled scans
- `AUTO_SCAN_INTERVAL_MINUTES`: scan interval (default `30`)
- `AUTO_SCAN_MAX_PAGES`: max paginated pages per client scan (default `3`)
- `AUTO_SCAN_MAX_QUERIES`: max brand queries per client per automation cycle (default `8`)
- `INTERNAL_API_KEY`: required header key for automation endpoints (`x-internal-api-key`)
- `SCAN_QUEUE_CONCURRENCY`: concurrent queued scan jobs (default `2`)
- `SCAN_QUEUE_MIN_INTERVAL_MS`: minimum delay between queued job starts (default `0`)
- `META_CIRCUIT_BREAKER_FAILURES`: failures before Meta circuit breaker opens (default `5`)
- `META_CIRCUIT_BREAKER_COOLDOWN_MS`: breaker cooldown duration (default `90000`)
- `SLACK_WEBHOOK_URL`: Slack incoming webhook for alert messages
- `TELEGRAM_BOT_TOKEN`: Telegram bot token for alert messages
- `TELEGRAM_CHAT_ID`: Telegram chat ID to receive alerts

The token is server-side only. Browser token entry/storage has been removed.
If the token is missing, scans run in demo mode.
You can now save token securely via Settings (encrypted at rest) if `APP_ENCRYPTION_KEY` is set.

### Persistence backend selection

- If `POSTGRES_URL`/`DATABASE_URL` is set: Postgres backend is used (production-ready for Vercel).
- If not set: local file backend is used under `APP_DATA_DIR`/`./data` (for local Docker/dev).

On Vercel, filesystem paths like `/var/task` are read-only, so Postgres is required for durable runtime state.

## Internal API Guarding

If `INTERNAL_API_KEY` is set, these routes require header `x-internal-api-key`:
- `POST /api/ads`
- `PUT /api/state`
- `GET/POST /api/scan-history`

## Docker

Use Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

Stop services:

```bash
docker compose down
```

## Available Scripts

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run test` - run lightweight internal test suite
- `npm run ci` - run lint, typecheck, tests, and production build

## Internal Persistence

- Clients and triage state are persisted server-side at `APP_DATA_DIR/state.json` (defaults to `./data/state.json`).
- `docker-compose.yml` mounts a named volume at `/app/data` for persistence across restarts.

## Health Endpoint

- `GET /api/health` returns:
  - token configuration status
  - internal API key configuration status
  - notifier configuration status (Slack/Telegram)
  - automation runtime status
  - datastore health (writable path)
  - service timestamp

## Automation Endpoints

- `POST /api/automation/run`: trigger one immediate scan cycle for all configured clients
- `GET /api/automation/status`: scheduler runtime status (enabled/running/last run/queue size)
- `GET /api/automation/policy`: read alert routing policy
- `PUT /api/automation/policy`: update alert routing policy (channel enablement, threshold, quiet hours)

Both automation endpoints require header:

```text
x-internal-api-key: <INTERNAL_API_KEY>
```

## State Backup and Restore

Use internal-key protected endpoints:

- `GET /api/state/backup`: export current persisted client/triage state
- `POST /api/state/backup`: restore state from provided payload

Header required:

```text
x-internal-api-key: <INTERNAL_API_KEY>
```

## Scan History

- `GET /api/scan-history?clientId=<id>&limit=20`: fetch recent client scan snapshots
- `POST /api/scan-history`: append scan snapshot (used by manual and automation flows)

## Operations Runbook

See [docs/OPERATIONS_RUNBOOK.md](./docs/OPERATIONS_RUNBOOK.md) for production operations and recovery procedures.

## Before Pushing to GitHub

1. Confirm secrets are not tracked:
   - `.env*` files are ignored (except `.env.example`).
   - Do not commit real API tokens.
2. Validate project locally:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
3. Commit with clear message.
4. Push to remote branch and open PR.

## Initial GitHub Push (if repo is new)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
