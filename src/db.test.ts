import { describe, it, expect, beforeEach } from 'vitest';
import {
  getJob, createJobIfNotExists, updateJobStatus,
  getBirdResult, saveBirdResult,
  getQueue, removeFromQueue,
  acquireLock, releaseLock,
  clearAll,
} from './db.js';
import { type Job } from './types.js';

const job = (name: string): Job => ({ name, status: 'queued', createdAt: '2024-01-01T00:00:00.000Z' });

beforeEach(async () => {
  await clearAll();
});

describe('getJob', () => {
  it('returns undefined for unknown bird', () => {
    expect(getJob('crow')).toBeUndefined();
  });

  it('returns job after creation', async () => {
    await createJobIfNotExists('crow', job('crow'));
    expect(getJob('crow')).toEqual(job('crow'));
  });
});

describe('createJobIfNotExists', () => {
  it('does not overwrite an existing job', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await createJobIfNotExists('crow', { ...job('crow'), status: 'done' });
    expect(getJob('crow')?.status).toBe('queued');
  });
});

describe('updateJobStatus', () => {
  it('updates status of existing job', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await updateJobStatus('crow', 'processing');
    expect(getJob('crow')?.status).toBe('processing');
  });

  it('does nothing for unknown job', async () => {
    await expect(updateJobStatus('crow', 'processing')).resolves.not.toThrow();
  });
});

describe('saveBirdResult / getBirdResult', () => {
  it('returns undefined before save', () => {
    expect(getBirdResult('crow')).toBeUndefined();
  });

  it('returns result after save', async () => {
    await saveBirdResult('crow', { name: 'crow', summary: 'A smart bird.' });
    expect(getBirdResult('crow')).toEqual({ name: 'crow', summary: 'A smart bird.' });
  });
});

describe('removeFromQueue', () => {
  it('removes the specified name', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await createJobIfNotExists('pelican', job('pelican'));
    await removeFromQueue('crow');
    expect(getQueue()).toEqual(['pelican']);
  });

  it('does nothing if name not in queue', async () => {
    await createJobIfNotExists('crow', job('crow'));
    await removeFromQueue('eagle');
    expect(getQueue()).toEqual(['crow']);
  });
});

describe('acquireLock / releaseLock', () => {
  it('first caller acquires the lock', async () => {
    expect(await acquireLock('crow')).toBe(true);
  });

  it('second caller cannot acquire the same lock', async () => {
    await acquireLock('crow');
    expect(await acquireLock('crow')).toBe(false);
  });

  it('lock can be acquired again after release', async () => {
    await acquireLock('crow');
    await releaseLock('crow');
    expect(await acquireLock('crow')).toBe(true);
  });
});
