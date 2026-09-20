# TypeScript templates

Placeholders: `<PageName>` (PascalCase), `<pageName>` (camelCase), `<page>` (kebab file name), `<route>`, `<Feature>`.

## `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const isCI = !!process.env.CI;
export const STORAGE_STATE = '.auth/user.json';

const deviceFor = { chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' } as const;
type Browser = keyof typeof deviceFor;
const browsers = (process.env.BROWSERS ?? 'chromium').split(',').map((b) => b.trim()).filter((b): b is Browser => b in deviceFor);
const suffix = (b: Browser) => (b === 'chromium' ? '' : `-${b}`);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  reporter: isCI ? [['blob'], ['github'], ['list']] : [['html', { open: 'never' }], ['list']],
  use: { baseURL: process.env.BASE_URL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'setup', testDir: './tests/setup', testMatch: /.*\.setup\.ts/ },
    { name: 'api', testDir: './tests/api', use: { baseURL: process.env.API_BASE_URL } },
    ...browsers.flatMap((b) => [
      { name: `ui${suffix(b)}`, testDir: './tests/ui', use: { ...devices[deviceFor[b]], storageState: STORAGE_STATE }, dependencies: ['setup'] },
      { name: `e2e${suffix(b)}`, testDir: './tests/e2e', use: { ...devices[deviceFor[b]], storageState: STORAGE_STATE }, dependencies: ['setup'] },
    ]),
  ],
});
```

## `utils/env.ts`

```ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`);
  return value;
}
export const env = {
  get BASE_URL(): string { return requireEnv('BASE_URL'); },
  get E2E_USERNAME(): string { return requireEnv('E2E_USERNAME'); },
  get E2E_PASSWORD(): string { return requireEnv('E2E_PASSWORD'); },
  get API_BASE_URL(): string { return requireEnv('API_BASE_URL'); },
  get API_USERNAME(): string { return requireEnv('API_USERNAME'); },
  get API_PASSWORD(): string { return requireEnv('API_PASSWORD'); },
};
```

## Page object — see SKILL.md canonical shape.

## Flow class `utils/e2e.ts`

```ts
import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login';
import { <LandingPage> } from '../pages/<landing>';
import { env } from './env';

export class E2E {
  readonly loginPage: LoginPage;
  readonly <landingPage>: <LandingPage>;

  constructor(readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.<landingPage> = new <LandingPage>(page);
  }

  async login(): Promise<void> {
    await test.step('Login as the configured E2E user', async () => {
      await this.loginPage.load();
      await this.loginPage.waitLoad();
      await this.loginPage.submitLoginForm(env.E2E_USERNAME, env.E2E_PASSWORD);
      await this.<landingPage>.waitLoad();
      // Bridge guard: confirms the transition, not a test outcome.
      await expect(this.<landingPage>.heading).toBeVisible();
    });
  }
}
```

## Fixtures

`fixtures/page.fixtures.ts`

```ts
import { test as base } from '@playwright/test';
import { <PageName>Page } from '../pages/<page>';

export interface PageFixtures { <pageName>Page: <PageName>Page }

export const pageFixture = base.extend<PageFixtures>({
  <pageName>Page: async ({ page }, use) => { await use(new <PageName>Page(page)); },
});
```

`fixtures/e2e.fixtures.ts`

```ts
import { test as base } from '@playwright/test';
import { E2E } from '../utils/e2e';
export interface E2EFixtures { e2e: E2E }
export const e2eFixture = base.extend<E2EFixtures>({
  e2e: async ({ page }, use) => { await use(new E2E(page)); },
});
```

`fixtures/index.fixtures.ts`

```ts
import { expect as baseExpect, mergeTests } from '@playwright/test';
import { z } from 'zod';
import { pageFixture } from './page.fixtures';
import { e2eFixture } from './e2e.fixtures';
import { apiFixture } from './api.fixtures';

export const test = mergeTests(pageFixture, e2eFixture, apiFixture);

export const expect = baseExpect.extend({
  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      message: () => (result.success ? 'Expected payload NOT to match schema' : `Payload does not match schema:\n${z.prettifyError(result.error)}`),
    };
  },
});
```

`fixtures/api.fixtures.ts`: see `api-layer.md`.

## Setup `tests/setup/auth.setup.ts`

```ts
import { test as setup } from '../../fixtures/index.fixtures';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate and save storage state', async ({ e2e, page }) => {
  await e2e.login();
  await page.context().storageState({ path: STORAGE_STATE });
});
```

## E2E spec `tests/e2e/<feature>.spec.ts`

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import data from '../../data/<feature>.json';

test.describe('<Feature>', { tag: ['@e2e'] }, () => {
  test.beforeEach(async ({ <landingPage> }) => {
    await test.step('Open <landing> as an authenticated user', async () => {
      await <landingPage>.load();
      await <landingPage>.waitLoad();
    });
  });

  test('should <complete the journey>', { tag: ['@smoke'] }, async ({ <landingPage>, <nextPage> }) => {
    await test.step('<Step one>', async () => {
      await <landingPage>.<action>(data.<key>);
      await <nextPage>.waitLoad();
      await expect(<nextPage>.heading).toBeVisible();
    });
  });
});
```

## `eslint.config.mjs`

Copy from the reference repository root; it defines the architecture gates (`no-restricted-imports`, `no-restricted-syntax`) for `tests/**`, `pages/**` and `api/**`.

## `.env.example`

```
BASE_URL=
E2E_USERNAME=
E2E_PASSWORD=
API_BASE_URL=
API_USERNAME=
API_PASSWORD=
# BROWSERS=chromium,firefox,webkit
# WORKERS=1
```
