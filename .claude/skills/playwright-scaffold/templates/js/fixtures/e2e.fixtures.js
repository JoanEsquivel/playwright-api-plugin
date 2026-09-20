import { test as base } from '@playwright/test';
import { E2E } from '../utils/e2e';

export const e2eFixture = base.extend({
  e2e: async ({ page }, use) => { await use(new E2E(page)); },
});
