import { describe, it, expect, beforeEach } from 'vitest';
import { db, jobKey, queueKey } from './db.js';
import { createBirdJob } from './birdService.js';

beforeEach(async () => {
  await db.clearAsync();
});

describe('createBirdJob', () => {
  it('no jobs: queue is empty', () => {
    expect(db.get(queueKey)).toBeUndefined();
  });

  it('one job: job record exists with queued status and queue contains the name', async () => {
    const job = await createBirdJob('crow');

    expect(job).toEqual({ name: 'crow', status: 'queued', createdAt: expect.any(String) });
    expect(db.get(jobKey('crow'))).toEqual(job);
    expect(db.get(queueKey)).toEqual(['crow']);
  });

  it('many jobs: queue preserves insertion order', async () => {
    await createBirdJob('crow');
    await createBirdJob('pelican');
    await createBirdJob('eagle');

    expect(db.get(queueKey)).toEqual(['crow', 'pelican', 'eagle']);
  });

  it('duplicate job: returns same record and queue contains name only once', async () => {
    const first = await createBirdJob('crow');
    const second = await createBirdJob('crow');

    expect(first).toEqual(second);
    expect(db.get(queueKey)).toEqual(['crow']);
  });
});
