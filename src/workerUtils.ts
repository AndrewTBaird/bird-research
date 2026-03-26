import { getQueue, acquireLock, releaseLock, getExpiredLocks, requeueJob } from './db.js';

const LEASE_TIMEOUT_MS = parseInt(process.env['LEASE_TIMEOUT_MS'] ?? '30000', 10);
import { executeBirdJob } from './birdService.js';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processJob(name: string): Promise<void> {
  const claimed = await acquireLock(name);
  if (!claimed) return;

  try {
    await executeBirdJob(name);
  } finally {
    await releaseLock(name);
  }
}

export async function runReaper(): Promise<void> {
  const expired = getExpiredLocks(LEASE_TIMEOUT_MS);
  await Promise.all(expired.map(requeueJob));
}

export async function processBatch(concurrency: number): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  const batch = queue.slice(0, concurrency);
  await Promise.all(batch.map(processJob));
}
