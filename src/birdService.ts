import { getJob, createJobIfNotExists, getBirdResult, saveBirdResult, updateJobStatus, removeFromQueue } from './db.js';
import { type Job, type BirdResult } from './types.js';
import { fetchBirdSummary, BirdNotFoundError } from './wikipedia.js';
import { withRetry } from './retry.js';
import { log } from './logger.js';

export async function createBirdJob(name: string): Promise<Job> {
  const existing = getJob(name);
  if (existing) return existing;

  const job: Job = { name, status: 'queued', createdAt: new Date().toISOString() };
  await createJobIfNotExists(name, job);
  log('job.created', { name });

  // Re-read in case a concurrent writer won the race
  return getJob(name) as Job;
}

export async function executeBirdJob(name: string): Promise<void> {
  await updateJobStatus(name, 'processing');
  await removeFromQueue(name);
  log('job.started', { name });

  try {
    const summary = await withRetry(
      () => fetchBirdSummary(name),
      (err) => !(err instanceof BirdNotFoundError),
    );
    await saveBirdResult(name, { name, summary });
    await updateJobStatus(name, 'done');
    log('job.completed', { name });
  } catch (err) {
    await updateJobStatus(name, 'failed');
    log('job.failed', { name, error: err instanceof Error ? err.message : String(err) });
    if (!(err instanceof BirdNotFoundError)) {
      throw err;
    }
  }
}

export function getBird(name: string): BirdResult | undefined {
  return getBirdResult(name);
}
