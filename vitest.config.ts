import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    env: {
      DB_PATH: './data-test',
      RETRY_BASE_DELAY_MS: '0',
      LEASE_TIMEOUT_MS: '0',
    },
  },
});
