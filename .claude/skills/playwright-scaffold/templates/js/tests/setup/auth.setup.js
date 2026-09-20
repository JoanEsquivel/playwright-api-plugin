import { test as setup } from '../../fixtures/index.fixtures';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate and save storage state', async ({ e2e, page }) => {
  await e2e.login();
  await page.context().storageState({ path: STORAGE_STATE });
});
