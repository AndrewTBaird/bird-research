# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install   # Install dependencies
npm run dev   # Run API server (port 3200)
```

```bash
npm test        # Run test suite
npm run worker  # Run worker process (WORKER_CONCURRENCY=N to set concurrency)
```

## Todo

- [x] Worker process (`src/worker.ts` + `src/workerUtils.ts`) — polls LMDB queue, processes jobs
  - `npm run worker` script, `WORKER_CONCURRENCY` env var controls async concurrency
  - Lock-based claiming via `acquireLock` / `releaseLock` prevents double-processing
- [x] Test suite — db operations, job claiming, lock behavior, batch concurrency (21 tests)
- [x] Retry with backoff on Wikipedia fetch failure; mark job `failed` after max retries (`src/retry.ts`, 3 attempts, exponential backoff, configurable via `RETRY_BASE_DELAY_MS`)
- [x] Lease expiry — reaper runs every poll cycle, requeues jobs with expired locks (30s timeout, configurable via `LEASE_TIMEOUT_MS`)
- [ ] Observability — structured logging, `/health` endpoint, counters for queue depth / jobs processed / failures
- [ ] README — what was built + what's next

## Architecture

This is a minimal Express 5 backend with LMDB persistence.

- **`src/index.ts`** — Express server on port 3200, routing only
- **`src/birdService.ts`** — business logic: `createBirdJob`, `executeBirdJob`, `getBird`
- **`src/db.ts`** — all LMDB operations; types live in `src/types.ts`
- **`src/worker.ts`** — entry point for worker process, polling loop only
- **`src/workerUtils.ts`** — `processJob` (lock → execute → release), `processBatch` (concurrency-aware)
- **`src/wikipedia.ts`** — `fetchBirdSummary(name)`, throws `BirdNotFoundError` on missing page
- **Database**: LMDB key-value store opened at `./data/` (gitignored). Initialized on first run.
- **TypeScript**: Strict mode with `nodenext` module resolution and `exactOptionalPropertyTypes`

The `data/` directory is created automatically by LMDB at runtime and is not committed.

# Interviewer Expectations #

Beyond the literal requirements, the interviewer is looking for:

- **Reliability thinking**: leases (worker crash recovery), retries with backoff (Wikipedia timeouts), idempotency (`POST /bird` twice with the same name should not create two jobs)
- **"backend/ai" framing**: Wikipedia is a stand-in for an LLM call — slow, expensive, potentially failing. The architecture should make it obvious it could swap in an AI call without structural changes.
- **Meaningful tests**: not happy-path unit tests — test the hard parts: concurrent job claiming (no double-processing), lease expiry/reclaim, retry behavior
- **Basic observability**: structured logging, a `/health` endpoint, counters for queue depth / jobs processed / failures — something that shows ops awareness
- **Readable, defensible code**: the follow-up call will interrogate every tradeoff; simple beats clever

# Requirements #

# WorkHero Engineering Take-Home (backend/ai)

### Overview

This take-home is a **2–3 hour** exercise you can do at home, followed by a **45-minute virtual follow-up** where you’ll walk us through your work, tradeoffs, and what you’d do next.

It’s intentionally **not** designed to be “finished.” We want to see what you can accomplish in **2–3 hours**, how you structure work, and how you communicate decisions.

You may use:

- Any IDE/editor, normal dev tooling
- AI tools are allowed (Claude Code, Codex, Cursor, etc.)

You can email any questions or issues to zak@workhero.pro. Please reach out if you have questions!

---

## Goal

Build a small system with:

1. an Express web service that a client can use to do “bird research”, and
2. a worker process you can run in parallel (any number of workers) that pulls jobs from a durable queue, does bird research, and stores results.

---

### Getting Started

- You can start with this [boilerplate project](https://github.com/WorkHeroPro/birds-template) or start from scratch if you prefer

---

## Constraints

- Use Node.js + Express
- Use a DB or simple persistence layer that supports read-write safety with multiple workers (recommended: LMDB)
- The worker should support N workers in parallel safely (at-least-once processing is fine)

---

## Data source for bird summaries

Use Wikipedia’s MediaWiki API “extracts” to fetch an intro summary for a given bird name. 

Example request :

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=Brown%20pelican&format=json&formatversion=2"
```

Imagine that we are planning to extend this service in the future to do long-running research tasks, so we need an architecture that can scale.

---

## Requirements

### 1) API Service

Implement at least these endpoints:

- `POST /bird`
    - Body: `{ "name": "brown pelican" }`
    - Creates a job with `status = "queued"` and enqueues it for processing.
    - Returns: `{ id, name, status, createdAt }`
- `GET /bird?name=brown%20pelican`
    - Returns the results of the job, or 404 if not finished

### 2) Durable queue + worker(s)

Create a separate runnable worker process, e.g.:

- `WORKER_CONCURRENCY=5 npm run worker`

The queue must support multiple workers running concurrently. Looking for a design that could theoretically work at scale.

---

## What we look for (how this will be evaluated)

We’ll prioritize organization and readable code

- sensible tradeoffs
- a small but meaningful test suite
- reliability thinking (leases / retries / idempotency)
- basic ops thinking (metrics + alerting)

We do not expect:

- production-grade infra
- auth

---

## Submission

When finished:

1. Push your changes to a Git repo (forked starter repo or your own; public or private is fine).
2. Make sure `README` includes:
    - how to run it
    - how to run tests
    - what you built + what you’d do next with more time
3. Share your submission by adding https://github.com/zakandrewking as a collaborator

---

## 45-minute follow-up

We’ll ask you to:

- Walk through the code and design decisions
- Open your editor and make code changes over screenshare
- Discuss tradeoffs, testing approach, and next steps
- **Please do not use AI tools during the follow up call**
