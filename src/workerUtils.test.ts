import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireLock, clearAll, createJobIfNotExists, getQueue } from './db.js';
import { processJob, processBatch } from './workerUtils.js';
import { type Job } from './types.js';

vi.mock('./birdService.js', () => ({
  executeBirdJob: vi.fn(),
}));

const { executeBirdJob } = await import('./birdService.js');

const job = (name: string): Job => ({ name, status: 'queued', createdAt: '2024-01-01T00:00:00.000Z' });

beforeEach(async () => {
  await clearAll();
  vi.clearAllMocks();
});

describe('processJob', () => {
  it('executes the job and releases the lock', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await processJob('crow');

    expect(executeBirdJob).toHaveBeenCalledWith('crow');
    expect(await acquireLock('crow')).toBe(true); // lock was released
  });

  it('skips if lock is already held', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await acquireLock('crow');

    await processJob('crow');

    expect(executeBirdJob).not.toHaveBeenCalled();
  });

  it('releases lock even if executeBirdJob throws', async () => {
    await createJobIfNotExists('crow', job('crow'));
    vi.mocked(executeBirdJob).mockRejectedValueOnce(new Error('network error'));

    await expect(processJob('crow')).rejects.toThrow('network error');
    expect(await acquireLock('crow')).toBe(true); // lock was released
  });
});

describe('processBatch', () => {
  it('does nothing when queue is empty', async () => {
    await processBatch(5);
    expect(executeBirdJob).not.toHaveBeenCalled();
  });

  it('respects concurrency limit', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await createJobIfNotExists('pelican', job('pelican'));
    await createJobIfNotExists('eagle', job('eagle'));

    await processBatch(2);

    expect(executeBirdJob).toHaveBeenCalledTimes(2);
  });
});
