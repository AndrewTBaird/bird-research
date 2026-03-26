# Getting Started

```bash
npm install
```

Run the API server and worker in separate terminals:

```bash
npm run dev                     # API server on port 3200
WORKER_CONCURRENCY=5 npm run worker  # worker process
```

# What Was Built

A bird research system with two components:

1. **API server** — accepts bird research requests via `POST /bird`, returns results via `GET /bird`
2. **Worker process** — polls a durable LMDB queue, fetches Wikipedia summaries, stores results

Jobs flow through statuses: `queued` → `processing` → `done` / `failed`. Workers claim jobs atomically using a lock key to prevent double-processing. A reaper runs every poll cycle to recover jobs from crashed workers.

# Design Decisions

- **Queue**: implemented as an ordered list in LMDB (`queue:pending`), maintained manually. No external broker required.
- **Idempotency**: `POST /bird` with the same name returns the existing job rather than creating a new one. Lock acquisition uses a transaction to prevent race conditions between concurrent workers.
- **Lease timeout**: 30s. If a worker holds a lock longer than this it is assumed crashed — the lock is released and the job is requeued. Configurable via `LEASE_TIMEOUT_MS`.
- **At-least-once processing**: a job may be processed more than once if a worker crashes after completing work but before releasing its lock. The result write is idempotent so this is safe.
- **Retry**: Wikipedia fetch retried up to 3 times with exponential backoff (1s, 2s, 4s). `BirdNotFoundError` is not retried.
- **Observability**: structured JSON logs on key events; `/health` endpoint returns queue depth.

# Database Schema

All data is stored in LMDB as key-value pairs.

| Key | Value | Description |
|---|---|---|
| `job:{name}` | `{ name, status, createdAt }` | Job record. Status: `queued`, `processing`, `done`, `failed` |
| `bird:{name}` | `{ name, summary }` | Wikipedia summary, written by worker on completion |
| `queue:pending` | `string[]` | Ordered list of bird names waiting to be processed |
| `lock:{name}` | `number` (timestamp) | Held by a worker while processing. Prevents double-processing. Expires after 30s |

# Unit Tests

```bash
npm test
```

# Manual Testing

### Single job

```bash
# Queue a job
curl -s -X POST http://localhost:3200/bird \
  -H "Content-Type: application/json" \
  -d '{"name": "crow"}'

# Poll for result (404 until worker finishes)
curl -s "http://localhost:3200/bird?name=crow"

# Idempotency — same name returns the existing job, not a new one
curl -s -X POST http://localhost:3200/bird \
  -H "Content-Type: application/json" \
  -d '{"name": "crow"}'
```

### Queue 30 jobs to observe concurrency

In one terminal, start the worker with high concurrency:

```bash
WORKER_CONCURRENCY=10 npm run worker
```

In another terminal, queue 30 birds at once:

```bash
birds=(
  "crow" "pelican" "eagle" "hawk" "falcon" "owl" "heron" "crane"
  "flamingo" "parrot" "toucan" "puffin" "albatross" "condor" "stork"
  "ibis" "kingfisher" "woodpecker" "robin" "sparrow" "finch" "wren"
  "swallow" "swift" "martin" "plover" "snipe" "curlew" "dunlin" "sanderling"
)

for bird in "${birds[@]}"; do
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$bird\"}" &
done
wait
```

Watch the queue drain via the health endpoint:

```bash
while true
do curl -s http://localhost:3200/health
echo
sleep 1
done
```

Check a result once the worker has processed it:

```bash
curl -s "http://localhost:3200/bird?name=eagle"
```
