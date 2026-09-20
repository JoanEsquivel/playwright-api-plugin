import { test, type Locator, type Page } from '@playwright/test';

/**
 * SCAFFOLD: landing page after login (or the public home page). Replace the
 * anchor with a page-specific heading or primary action found on the live page.
 */
export class HomePage {
  readonly page: Page;
  readonly url = '/';
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading').first().describe('Main heading');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Home page to load', async () => {
      await this.heading.waitFor({ state: 'visible' });
    });
  }
}
