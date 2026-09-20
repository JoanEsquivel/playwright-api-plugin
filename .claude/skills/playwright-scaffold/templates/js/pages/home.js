// @ts-check
import { test } from '@playwright/test';

/**
 * SCAFFOLD: landing page after login (or the public home page). Replace the
 * anchor with a page-specific heading or primary action found on the live page.
 */
export class HomePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = '/';
    this.heading = page.getByRole('heading').first().describe('Main heading');
  }

  async load() {
    await this.page.goto(this.url);
  }

  async waitLoad() {
    await test.step('Wait for Home page to load', async () => {
      await this.heading.waitFor({ state: 'visible' });
    });
  }
}
