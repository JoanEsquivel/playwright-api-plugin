// @ts-check
import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login';
import { HomePage } from '../pages/home';
import { env } from './env';

/**
 * Multi-page flows. Action-only, except for the documented "bridge guard":
 * an `expect` that confirms a page transition happened so the next step is safe.
 */
export class E2E {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.homePage = new HomePage(page);
  }

  /** SCAFFOLD: adjust to the real login flow and landing page of the application. */
  async login() {
    await test.step('Login as the configured E2E user', async () => {
      await this.loginPage.load();
      await this.loginPage.waitLoad();
      await this.loginPage.submitLoginForm(env.E2E_USERNAME, env.E2E_PASSWORD);
      await this.homePage.waitLoad();
      // Bridge guard: confirms the transition, not a test outcome.
      await expect(this.homePage.heading).toBeVisible();
    });
  }
}
