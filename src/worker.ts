import { sleep, processBatch } from './workerUtils.js';

const CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '1', 10);

async function poll(): Promise<void> {
  while (true) {
    await processBatch(CONCURRENCY);
    await sleep(2000);
  }
}

poll();
