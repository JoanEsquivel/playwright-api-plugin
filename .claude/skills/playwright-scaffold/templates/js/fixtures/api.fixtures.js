import { test as base, request } from '@playwright/test';
import { AuthClient } from '../api/clients/auth.client';
import { env } from '../utils/env';

/** @param {import('@playwright/test').APIRequestContext} context */
const createClients = (context) => ({
  auth: new AuthClient(context),
});

export const apiFixture = base.extend({
  /** Anonymous clients bound to the project's baseURL. */
  api: async ({ request }, use) => {
    await use(createClients(request));
  },

  // SCAFFOLD: adapt to the API's auth scheme (bearer token shown; cookie/API key also fine).
  authToken: [
    async ({}, use) => {
      const context = await request.newContext({ baseURL: env.API_BASE_URL });
      const response = await new AuthClient(context).login(env.API_USERNAME, env.API_PASSWORD);
      if (!response.ok()) {
        throw new Error(`API login failed: ${response.status()} ${await response.text()}`);
      }
      const { accessToken } = await response.json();
      await context.dispose();
      await use(accessToken);
    },
    { scope: 'worker' },
  ],

  /** Clients whose context sends `Authorization: Bearer <authToken>`. */
  authedApi: async ({ authToken, baseURL }, use) => {
    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${authToken}` },
    });
    await use(createClients(context));
    await context.dispose();
  },
});
