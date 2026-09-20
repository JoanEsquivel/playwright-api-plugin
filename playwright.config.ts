import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { env } from './utils/env';

dotenv.config({ quiet: true });

const isCI = !!process.env.CI;

/**
 * Optional: start the API under test. Enabled only when API_SERVER_COMMAND is set,
 * so the framework also works against an API that is already running somewhere else.
 */
if (env.API_SERVER_COMMAND && !env.API_SERVER_READY_URL) {
  // API_BASE_URL is not a fallback: Playwright only treats < 404 as ready, and a bare prefix often answers 404.
  throw new Error('API_SERVER_COMMAND is set but API_SERVER_READY_URL is not. Point it at a URL that answers 2xx once the API is up (for example its health endpoint).');
}

const webServer = env.API_SERVER_COMMAND
  ? {
      command: env.API_SERVER_COMMAND,
      cwd: env.API_SERVER_CWD,
      url: env.API_SERVER_READY_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    }
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  reporter: isCI ? [['blob'], ['github'], ['list']] : [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
  },
  webServer,
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.API_BASE_URL },
    },
  ],
});
