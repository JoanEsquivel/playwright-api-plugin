// @ts-check
import { test } from '@playwright/test';

/**
 * SCAFFOLD: generic login page. Verify every locator against the live page
 * (`playwright-cli open <BASE_URL>` → `snapshot`) and adjust names/roles/url.
 */
export class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = '/';
    this.usernameInput = page.getByRole('textbox', { name: /user ?name|email/i }).describe('Username input');
    this.passwordInput = page.getByRole('textbox', { name: /password/i }).describe('Password input');
    this.loginButton = page.getByRole('button', { name: /log ?in|sign ?in/i }).describe('Login button');
    this.errorMessage = page.getByRole('alert').describe('Login error message');
  }

  async load() {
    await this.page.goto(this.url);
  }

  async waitLoad() {
    await test.step('Wait for Login page to load', async () => {
      await this.loginButton.waitFor({ state: 'visible' });
    });
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async submitLoginForm(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
