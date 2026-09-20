import { test, expect } from '../../fixtures/index.fixtures';

test.describe('Home page', { tag: ['@ui'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await test.step('Load home page', async () => {
      await homePage.load();
      await homePage.waitLoad();
    });
  });

  test('should render the main heading', { tag: ['@smoke'] }, async ({ homePage }) => {
    await expect(homePage.heading).toBeVisible();
    await expect(homePage.page).toHaveTitle(/.+/);
  });
});
