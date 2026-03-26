import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from './retry.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('withRetry', () => {
  it('returns result immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, () => true);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, () => true);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws immediately without retrying when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent'));
    await expect(withRetry(fn, () => false)).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('transient'));
    await expect(withRetry(fn, () => true)).rejects.toThrow('transient');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
