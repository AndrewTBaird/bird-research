import { sleep, processBatch, runReaper } from './workerUtils.js';

const CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '1', 10);

async function poll(): Promise<void> {
  while (true) {
    await runReaper();
    await processBatch(CONCURRENCY);
    await sleep(5000);
  }
}

poll();
