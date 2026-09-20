import { test as base } from '@playwright/test';
import { E2E } from '../utils/e2e';

export interface E2EFixtures {
  e2e: E2E;
}

export const e2eFixture = base.extend<E2EFixtures>({
  e2e: async ({ page }, use) => { await use(new E2E(page)); },
});
