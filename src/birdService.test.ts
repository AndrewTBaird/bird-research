import { describe, it, expect, beforeEach } from 'vitest';
import { getJob, getQueue, clearAll } from './db.js';
import { createBirdJob } from './birdService.js';

beforeEach(async () => {
  await clearAll();
});

describe('createBirdJob', () => {
  it('no jobs: queue is empty', () => {
    expect(getQueue()).toEqual([]);
  });

  it('one job: job record exists with queued status and queue contains the name', async () => {
    const job = await createBirdJob('crow');

    expect(job).toEqual({ name: 'crow', status: 'queued', createdAt: expect.any(String) });
    expect(getJob('crow')).toEqual(job);
    expect(getQueue()).toEqual(['crow']);
  });

  it('many jobs: queue preserves insertion order', async () => {
    await createBirdJob('crow');
    await createBirdJob('pelican');
    await createBirdJob('eagle');

    expect(getQueue()).toEqual(['crow', 'pelican', 'eagle']);
  });

  it('duplicate job: returns same record and queue contains name only once', async () => {
    const first = await createBirdJob('crow');
    const second = await createBirdJob('crow');

    expect(first).toEqual(second);
    expect(getQueue()).toEqual(['crow']);
  });
});
