import { db, jobKey, birdKey, queueKey, type Job, type BirdResult } from './db.js';

export async function createBirdJob(name: string): Promise<Job> {
  let job = db.get(jobKey(name)) as Job | undefined;
  if (job) return job;

  job = { name, status: 'queued', createdAt: new Date().toISOString() };
  await db.ifNoExists(jobKey(name), () => {
    db.put(jobKey(name), job);
    addToQueue(name)
  });

  // Re-read in case a concurrent writer won the race
  return db.get(jobKey(name)) as Job;
}

export function getBirdResult(name: string): BirdResult | undefined {
  return db.get(birdKey(name)) as BirdResult | undefined;
}

function addToQueue(name: string) {
  let workerQueue = db.get(queueKey)
  if (!workerQueue) {
    workerQueue = [name]
    return 
  }

  if (workerQueue.includes(name)) {
    return
  }

  workerQueue.push(name)
  console.log(db.get(queueKey))
}
