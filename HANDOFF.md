# FB-Page-Management — Handoff Notes

Purpose: short developer handoff so you can continue work later without losing context.

## Current state (high level)

- Backend: Node.js + TypeScript, Express, Prisma (Postgres). API served at `http://localhost:4000` by default.
- Frontend: Next.js (App Router) + TailwindCSS. Dev server runs at `http://localhost:3002` by default.
- Queue/Workers: BullMQ with Redis. Workers implemented for webhook processing and outbound sends.
- Realtime: Socket.IO on the backend; frontend connects and joins `org:{orgId}` rooms.

Major completed features:

- Auth (register/login/JWT)
- Meta OAuth & Page connect
- Webhook endpoint + `webhookWorker` normalization
- Unified Inbox UI (3-column), Composer, Socket.IO client
- Outbound message flow moved to a BullMQ `sendWorker` with retries and backoff
- Message states (`SENDING`, `SENT`, `FAILED`) and retry endpoint
- Basic Tags and Quick Replies UI + CRUD backend routes
- Minimal Team routes and Team UI

## Important files (quick links)

- Backend entry: [backend/src/main.ts](backend/src/main.ts#L1)
- Outbound send worker: [backend/src/worker/sendWorker.ts](backend/src/worker/sendWorker.ts#L1)
- Webhook worker: [backend/src/worker/webhookWorker.ts](backend/src/worker/webhookWorker.ts#L1)
- Conversations API: [backend/src/routes/conversations.ts](backend/src/routes/conversations.ts#L1)
- Messages retry API: [backend/src/routes/messages.ts](backend/src/routes/messages.ts#L1)
- Auth routes: [backend/src/routes/auth.ts](backend/src/routes/auth.ts#L1)
- Team routes: [backend/src/routes/team.ts](backend/src/routes/team.ts#L1)
- Crypto helpers: [backend/src/lib/crypto.ts](backend/src/lib/crypto.ts#L1)
- Meta services: [backend/src/services/meta.ts](backend/src/services/meta.ts#L1)
- Frontend inbox UI: [frontend/components/InboxColumns.tsx](frontend/components/InboxColumns.tsx#L1)
- Sidebar: [frontend/components/Sidebar.tsx](frontend/components/Sidebar.tsx#L1)
- Login: [frontend/app/login/page.tsx](frontend/app/login/page.tsx#L1)
- FB connect UI: [frontend/app/facebook/connect/page.tsx](frontend/app/facebook/connect/page.tsx#L1)
- Tags UI: [frontend/app/tags/page.tsx](frontend/app/tags/page.tsx#L1)
- Quick Replies UI: [frontend/app/quick-replies/page.tsx](frontend/app/quick-replies/page.tsx#L1)

## Environment variables (common)

Create a `.env` in `backend/` with at least:

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string (e.g. `redis://localhost:6379`)
- `JWT_SECRET` — secret for signing JWTs
- `INTERNAL_API_SECRET` — secret used by worker → server internal emit
- `API_URL` — public URL for the API (dev: `http://localhost:4000`)
- `META_APP_ID`, `META_APP_SECRET`, `META_API_VERSION` — Facebook app config
- `TOKEN_ENCRYPTION_KEY` — 32-byte key to encrypt stored page tokens (recommended)

If `TOKEN_ENCRYPTION_KEY` is not set, the repo logs a warning and tokens are left unencrypted.

## Run locally (dev)

Prereqs: Node 18+, npm, Postgres, Redis.

1. Start Postgres + Redis (manually or via Docker). Example Docker compose (optional):

```bash
docker run -d --name fbpm-postgres -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres
docker run -d --name fbpm-redis -p 6379:6379 redis
```

2. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

3. Worker(s)

Open another terminal for webhook worker (processes incoming webhook events):

```bash
cd backend
npm run worker            # runs webhookWorker
```

Start the send worker (processes outbound messages):

```bash
cd backend
npm run worker:send       # runs sendWorker
```

4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3002` and `http://localhost:4000`.

## How message send flow works

- When an agent posts a message via `POST /api/conversations/:id/messages`, a `Message` is created with `state = SENDING` and the `sendWorker` is enqueued (BullMQ).
- `sendWorker` attempts to send via `MetaMessengerService.sendMessage()` using the page token (decrypted by `lib/crypto`).
- On success, the message `state` is updated to `SENT` and `externalMessageId` recorded. The worker emits an internal update via `/api/internal/emit` using `INTERNAL_API_SECRET`.
- On repeated failures the job `failed` handler marks the `Message` as `FAILED` after attempts exhausted.

## Remaining work / Suggested next steps

These are the items I left as in-progress so you can pick them up tomorrow:

1. Tests, README, seeds
   - Add unit/integration tests for core flows (auth, webhook verification, worker processing, sendWorker behavior).
   - Add seed script for demo org/pages/users.

2. Security & production review
   - Validate all required env vars at startup and fail fast.
   - Use secure cookie storage for JWT (optional) and CSRF protections for web UI.
   - Add rate limiting and request validation.

3. UI polish
   - Continue applying the design across remaining screens (header, conversation list details, responsive behavior).
   - Add components for tags/quick-replies insertion into composer.

4. Robustness
   - Add idempotency/dedup for webhook events (use `webhookEvent.eventId`).
   - Add monitoring/metrics for BullMQ jobs and worker health.

## Quick testing tips

- To simulate an incoming Messenger webhook, POST a realistic FB-like payload to `POST /api/webhooks` (ensure signature verification is satisfied or temporarily disable verification in dev).
- To simulate sending a message from frontend, login and use the composer in the Inbox UI.

## Notes / gotchas

- On Windows, Prisma `prisma generate` occasionally fails due to file locks — stop any running node processes and retry.
- If `sendWorker` can't find the page token (or `TOKEN_ENCRYPTION_KEY` mismatch), sends will fail and messages will be marked `FAILED`.

---

If you want, I can also add a `docker-compose.yml` and a minimal `seed.ts` script now so starting is a single command. Tell me and I'll add them.
