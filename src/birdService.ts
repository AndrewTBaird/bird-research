import { getJob, createJobIfNotExists, getBirdResult, saveBirdResult, updateJobStatus, removeFromQueue } from './db.js';
import { type Job, type BirdResult } from './types.js';
import { fetchBirdSummary, BirdNotFoundError } from './wikipedia.js';

export async function createBirdJob(name: string): Promise<Job> {
  const existing = getJob(name);
  if (existing) return existing;

  const job: Job = { name, status: 'queued', createdAt: new Date().toISOString() };
  await createJobIfNotExists(name, job);

  // Re-read in case a concurrent writer won the race
  return getJob(name) as Job;
}

export async function executeBirdJob(name: string): Promise<void> {
  await updateJobStatus(name, 'processing');
  await removeFromQueue(name);
  
  try {
    const summary = await fetchBirdSummary(name);
    await saveBirdResult(name, { name, summary });
    await updateJobStatus(name, 'done');
  } catch (err) {
    await updateJobStatus(name, 'failed');
    if (!(err instanceof BirdNotFoundError)) {
      throw err;
    }
  }
}

export function getBird(name: string): BirdResult | undefined {
  return getBirdResult(name);
}
