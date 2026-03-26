import { describe, it, expect, beforeEach } from 'vitest';
import { acquireLock, clearAll, createJobIfNotExists, getJob, getQueue, getExpiredLocks, requeueJob, removeFromQueue } from './db.js';
import { runReaper } from './workerUtils.js';
import { type Job } from './types.js';

const job = (name: string): Job => ({ name, status: 'queued', createdAt: '2024-01-01T00:00:00.000Z' });

beforeEach(async () => {
  await clearAll();
});

describe('getExpiredLocks', () => {
  it('returns empty when no locks exist', () => {
    expect(getExpiredLocks(30000)).toEqual([]);
  });

  it('returns empty when lock is within timeout', async () => {
    await acquireLock('crow');
    expect(getExpiredLocks(30000)).toEqual([]);
  });

  it('returns name when lock is expired', async () => {
    await acquireLock('crow');
    expect(getExpiredLocks(-1)).toEqual(['crow']);
  });
});

describe('requeueJob', () => {
  it('releases lock, resets status to queued, and adds back to queue', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await acquireLock('crow');
    await removeFromQueue('crow'); // simulate worker claiming the job

    await requeueJob('crow');

    expect(getJob('crow')?.status).toBe('queued');
    expect(getQueue()).toContain('crow');
    expect(await acquireLock('crow')).toBe(true); // lock was released
  });

  it('does not add to queue twice if already present', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await acquireLock('crow');

    await requeueJob('crow');

    expect(getQueue().filter(n => n === 'crow')).toHaveLength(1);
  });
});

describe('runReaper', () => {
  it('requeues jobs with expired leases', async () => {
    // LEASE_TIMEOUT_MS=0 in test env — any lock acquired before now is expired
    await createJobIfNotExists('crow', job('crow'));
    await acquireLock('crow');
    await removeFromQueue('crow');

    await runReaper();

    expect(getJob('crow')?.status).toBe('queued');
    expect(getQueue()).toContain('crow');
  });

  it('leaves non-expired locks alone', async () => {
    await createJobIfNotExists('crow', job('crow'));
    expect(getExpiredLocks(30000)).toEqual([]);
  });
});
