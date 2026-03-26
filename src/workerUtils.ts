import { getQueue, acquireLock, releaseLock } from './db.js';
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

export async function processBatch(concurrency: number): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  const batch = queue.slice(0, concurrency);
  await Promise.all(batch.map(processJob));
}
