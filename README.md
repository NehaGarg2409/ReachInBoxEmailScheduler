# ReachInbox Email Scheduler

A production-shaped email scheduler + dashboard: schedule sends via API, run them through
BullMQ delayed jobs (no cron), enforce per-sender throughput and hourly caps, alert Slack on
rate-limit breaches, and browse everything from a Next.js dashboard.

See `/mnt/user-data/outputs/reachinbox-architecture-plan.md` (or the design doc shared earlier)
for the full architecture writeup. This README covers running it and the specific decisions
the assignment asks to be documented.

## Project layout

```
reachinbox/
  docker-compose.yml     # Postgres, Redis, Elasticsearch
  backend/               # Express + TypeScript + BullMQ + Prisma
  frontend/              # Next.js + Tailwind + TypeScript
```

## Prerequisites

- Node.js 20+
- Docker (for Postgres/Redis/Elasticsearch) — or point `DATABASE_URL` / `REDIS_URL` /
  `ELASTICSEARCH_URL` at your own instances.
- A free Ethereal Email account: https://ethereal.email/create (gives you an SMTP
  user/pass for fake sending).
- Google OAuth credentials: https://console.cloud.google.com/apis/credentials
  (Authorized redirect URI: `http://localhost:4000/auth/google/callback`)
- A Slack app with the `incoming-webhook` scope: https://api.slack.com/apps
  (Redirect URL: `http://localhost:4000/auth/slack/callback`)

## Setup

```bash
# 1. Start infra
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env   # fill in Google/Slack/Ethereal credentials
npm install
npm run prisma:migrate
npm run dev             # starts the Express API on :4000
# in a second terminal:
npm run worker:dev      # starts the BullMQ worker

# 3. Frontend
cd ../frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev             # starts Next.js on :3000
```

Then:
1. Visit `http://localhost:3000`, sign in with Google.
2. Add a sender via `POST /api/senders` (using your Ethereal creds) — no dedicated UI
   screen was built for this in the time available; a quick curl or Postman call is enough:
   ```bash
   curl -X POST http://localhost:4000/api/senders \
     -H "Content-Type: application/json" \
     -b "reachinbox_session=<your session cookie>" \
     -d '{"displayName":"Demo Sender","smtpUser":"xxx@ethereal.email","smtpPass":"xxx"}'
   ```
3. Click "Connect Slack" in the header to enable rate-limit alerts.
4. Compose an email, upload a CSV/text file of leads, and schedule.
5. Watch the queue at `http://localhost:4000/admin/queues` (Bull Board).

## Design decisions & trade-offs (as required by the brief)

### Delay between sends
Minimum delay between individual sends is **configurable per batch** (`delayMs` field,
default 2000ms / 2 seconds) and enforced two ways:
- Initial stagger: recipient `scheduledAt` timestamps are spaced `delayMs` apart when a
  batch is created.
- Ongoing enforcement: BullMQ's **grouped rate limiter** (`limiter: { max: 1, duration: delayMs }`
  with `group: { id: senderId }`) re-enforces this spacing per sender at the queue level, so
  even if many jobs become "ready" at once, the worker still only pulls one per sender per
  `delayMs` window.

### Hourly rate limiting
Enforced with **Redis `INCR`/`DECR` counters** keyed by `ratelimit:{senderId}:{YYYY-MM-DDTHH}`,
not BullMQ's built-in limiter. Reasoning: BullMQ's limiter is well-suited to *spacing* jobs,
but has no built-in concept of "defer to the next clock hour and keep FIFO order." The
Redis counter approach is atomic (`INCR` is a single Redis operation) and therefore safe
across multiple worker processes/instances without any in-memory state. When a sender's
counter exceeds `MAX_EMAILS_PER_HOUR_PER_SENDER` (configurable via env, defaults to 200,
also overridable per batch from the compose form):
1. The consumed slot is given back (`DECR`) since the send didn't happen.
2. The job is **re-enqueued with the same BullMQ `jobId`** (the email's UUID) at a delay
   targeting the start of the next hour — this preserves idempotency (no duplicate jobs)
   and keeps jobs roughly FIFO since BullMQ processes delayed jobs in time order.
3. A Slack notification fires (deduped so only the *first* breach in a given hour per
   sender triggers an alert, not one message per throttled job).

Trade-off: this means an over-scheduled sender's excess emails cascade hour-by-hour until
they clear, rather than all firing at once at the next boundary — this is intentional, to
keep respecting the same hourly cap on each subsequent hour too.

### Idempotency & restart safety
- **BullMQ `jobId` = the `Email` row's UUID.** Adding a job with an existing `jobId` is a
  documented BullMQ no-op, so any code path that might run twice (initial schedule,
  rate-limit reschedule, startup reconciliation) can safely call `enqueueEmailJob` without
  risk of duplicate sends.
- **Worker-side guard:** before sending, the worker checks `email.status === 'sent'` and
  exits early if so — this covers the edge case of a crash between "SMTP accepted the
  message" and "Postgres was updated."
- **Startup reconciliation pass** (`reconcileUnqueuedEmails` in `backend/src/index.ts`):
  on every boot, re-adds any `Email` row still in `pending`/`queued` status into BullMQ.
  Jobs already living in Redis survive restarts on their own (Redis AOF persistence, see
  `docker-compose.yml`); this pass only exists to close the narrow gap where a DB row was
  committed but the process crashed *before* the corresponding `queue.add()` call ever ran.
  Because of the `jobId` idempotency guarantee above, running this on every boot is always
  safe, even when most rows already have a live job.

### Behavior under load (1000+ emails scheduled at once)
- All 1000 `Email` rows and BullMQ jobs are created in the same request; BullMQ's delayed
  jobs are processed in time order as their delays expire, gated by `WORKER_CONCURRENCY`
  (configurable, default 5) and the per-sender grouped limiter.
- The Redis hourly counter naturally spills overflow into subsequent hour windows without
  any special-casing — the same code path used for a single email handles 1000 identically.
- Nothing is dropped or permanently failed purely due to volume; SMTP-level failures still
  go through BullMQ's own `attempts`/`backoff` retry policy (configured to 3 attempts,
  exponential backoff) before landing in `failed`.

### Elasticsearch
Dual-write on every status transition (`pending → queued → sent/failed`) directly from the
API/worker into an `emails` index, wrapped in try/catch so a search-indexing failure never
blocks or fails an actual send — Postgres remains the source of truth. For a system at this
scope, this is simpler and sufficiently reliable than standing up a CDC pipeline
(e.g. Debezium) to keep ES in sync; the trade-off is a small window of index staleness if a
dual-write itself fails, which is acceptable for a search/browse feature.

### Slack integration
Real OAuth (`https://slack.com/oauth/v2/authorize` with `incoming-webhook` scope), token
and webhook URL stored per user in Postgres. The rate-limit-hit code path looks up the
connection **fresh on every breach** rather than caching it at startup — so connecting
Slack mid-session starts producing alerts immediately, no redeploy needed. If no connection
exists, the notifier no-ops silently rather than throwing, so a disconnected user never
crashes the worker.

## What's stubbed / simplified given the time box
- No dedicated "Add sender" screen in the frontend — a `POST /api/senders` endpoint exists;
  wiring a small form to it is the same pattern as the compose modal.
- No pagination controls rendered in the tables yet (API supports `?page=`), only the first
  page is fetched by the hooks.
- CSV parsing accepts either a single email-per-line text file or a CSV with emails in any
  column (regex-filtered), rather than requiring a specific column header.


  Youtube Demo Link :- https://youtu.be/Ql3MNtrw6GA


