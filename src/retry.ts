const BASE_DELAY_MS = parseInt(process.env['RETRY_BASE_DELAY_MS'] ?? '1000', 10);
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err)) throw err;
      lastErr = err;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastErr;
}
