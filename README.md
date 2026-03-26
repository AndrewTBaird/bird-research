# Getting Started

```
npm install
npm run dev && npm run worker
```

# Database Schema

All data is stored in LMDB as key-value pairs.

| Key | Value | Description |
|---|---|---|
| `job:{name}` | `{ name, status, createdAt }` | Job record. Status: `queued`, `processing`, `done`, `failed` |
| `bird:{name}` | `{ name, summary }` | Wikipedia summary, written by worker on completion |
| `queue:pending` | `string[]` | Ordered list of bird names waiting to be processed |
| `lock:{name}` | `number` (timestamp) | Held by a worker while processing. Prevents double-processing. Expires after 30s |

# Design Decisions

- **Lease timeout**: 30s. If a worker holds a lock longer than this, it is assumed crashed. The lock is released and the job is requeued. Configurable via `LEASE_TIMEOUT_MS`.
- **Reaper**: runs every poll cycle (every 2s), scanning all active locks for expiry.
- **At-least-once processing**: a job may be processed more than once if a worker crashes after completing the work but before releasing the lock. The result write is idempotent so this is safe.
- **Retry**: Wikipedia fetch is retried up to 3 times with exponential backoff (1s, 2s, 4s). `BirdNotFoundError` is not retried.

# Unit Tests

```
npm test
```

# Manual Testing
## Create a job
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "crow"}'

  # Create another
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "pelican"}'

  # Idempotency check — same name again
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "crow"}'

  # Get result (will 404 until worker processes it)
  curl -s "http://localhost:3200/bird?name=crow"
