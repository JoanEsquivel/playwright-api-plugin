import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login';
import { HomePage } from '../pages/home';

export interface PageFixtures {
  loginPage: LoginPage;
  homePage: HomePage;
}

export const pageFixture = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  homePage: async ({ page }, use) => { await use(new HomePage(page)); },
});
