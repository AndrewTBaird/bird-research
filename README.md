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

This requires 4 terminals. Start them in order so the health check is running before jobs are queued.

**Terminal 1** — API server:
```bash
npm run dev
```

**Terminal 2** — Worker with high concurrency:
```bash
WORKER_CONCURRENCY=10 npm run worker
```

**Terminal 3** — Watch queue depth (start this before queuing jobs):
```bash
while true
do curl -s http://localhost:3200/health
echo
sleep 1
done
```

**Terminal 4** — Queue 30 birds:
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

You should see queue depth spike in Terminal 3 then drain to 0 as the worker processes jobs. Check a result after:

```bash
curl -s "http://localhost:3200/bird?name=eagle"
```

# What's Next

**Replace LMDB with a real queue broker.** LMDB works well for a single machine, but the queue implementation (a list in a KV store, polling, manual locking) is reinventing what Redis Streams, SQS, or RabbitMQ give you out of the box. Moving to a proper broker would also decouple workers from the API server's host, enable horizontal scaling across machines, and remove the lock/lease plumbing entirely.

**Dead-letter queue.** Right now jobs that exhaust retries are marked `failed` and left in place. A DLQ would give ops a place to inspect them, replay selectively, and alert on failure rate without scanning all job records.

**Webhook / SSE notification.** Clients currently have to poll `GET /bird` until the job completes. A webhook callback URL on `POST /bird`, or a server-sent events stream, would eliminate polling and make the API composable with downstream automation.

**Graceful shutdown.** Workers don't currently handle `SIGTERM`. A worker killed mid-job will hold its lock until the lease expires (up to 30s). Proper shutdown would finish in-flight work, skip claiming new jobs, and exit cleanly — important for rolling deploys.

**Metrics endpoint.** `/health` returns queue depth, but a Prometheus-compatible `/metrics` endpoint (jobs processed, failure rate, processing latency p50/p95, lease expirations) would make the system observable without log scraping.
