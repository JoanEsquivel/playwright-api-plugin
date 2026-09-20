// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isCI = !!process.env.CI;

/** Storage state produced by tests/setup/auth.setup.js and consumed by ui/e2e projects. */
export const STORAGE_STATE = '.auth/user.json';

/** @type {Record<string, string>} */
const deviceFor = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

const browsers = (process.env.BROWSERS ?? 'chromium')
  .split(',')
  .map((b) => b.trim())
  .filter((b) => b in deviceFor);

/** @param {string} browser */
const suffix = (browser) => (browser === 'chromium' ? '' : `-${browser}`);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  reporter: isCI ? [['blob'], ['github'], ['list']] : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testDir: './tests/setup', testMatch: /.*\.setup\.js/ },
    // @api-start
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL },
    },
    // @api-end
    ...browsers.flatMap((browser) => [
      {
        name: `ui${suffix(browser)}`,
        testDir: './tests/ui',
        use: { ...devices[deviceFor[browser]], storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
      {
        name: `e2e${suffix(browser)}`,
        testDir: './tests/e2e',
        use: { ...devices[deviceFor[browser]], storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
    ]),
  ],
});
