import { open } from 'lmdb';
import { type Job, type BirdResult } from './types.js';

const db = open({ path: process.env['DB_PATH'] ?? './data' });

const jobKey = (name: string) => `job:${name}`;
const birdKey = (name: string) => `bird:${name}`;
const lockKey = (name: string) => `lock:${name}`;
const QUEUE_KEY = 'queue:pending';

export function getJob(name: string): Job | undefined {
  return db.get(jobKey(name)) as Job | undefined;
}

export async function createJobIfNotExists(name: string, job: Job): Promise<void> {
  await db.ifNoExists(jobKey(name), () => {
    db.put(jobKey(name), job);

    const queue = getQueue() as string[];
    if (!queue.includes(name)) {
      db.put(QUEUE_KEY, [...queue, name]);
    }
  });
}

export async function updateJobStatus(name: string, status: Job['status']): Promise<void> {
  const job = db.get(jobKey(name)) as Job | undefined;
  if (job) {
    await db.put(jobKey(name), { ...job, status });
  }
}

export function getBirdResult(name: string): BirdResult | undefined {
  return db.get(birdKey(name)) as BirdResult | undefined;
}

export async function saveBirdResult(name: string, result: BirdResult): Promise<void> {
  await db.put(birdKey(name), result);
}

export function getQueue(): string[] {
  return db.get(QUEUE_KEY) as string[] | undefined ?? [];
}

export async function setQueue(queue: string[]): Promise<void> {
  await db.put(QUEUE_KEY, queue);
}

export async function removeFromQueue(name: string): Promise<void> {
  const queue = getQueue().filter(n => n !== name);
  await db.put(QUEUE_KEY, queue);
}

export async function acquireLock(name: string): Promise<boolean> {
  let claimed = false;
  await db.transaction(() => {
    if (db.get(lockKey(name)) === undefined) {
      db.put(lockKey(name), Date.now());
      claimed = true;
    }
  });
  return claimed;
}

export async function releaseLock(name: string): Promise<void> {
  await db.remove(lockKey(name));
}

export async function clearAll(): Promise<void> {
  await db.clearAsync();
}
