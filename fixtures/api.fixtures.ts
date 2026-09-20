import { randomUUID } from 'node:crypto';
import { test as base, request, type APIRequestContext, type Page } from '@playwright/test';
import { withApiLog, type ApiRequest } from '@/api/api-log';
import { AdminProductsClient } from '@/api/clients/admin-products.client';
import { AuthClient } from '@/api/clients/auth.client';
import { CartClient } from '@/api/clients/cart.client';
import { OrdersClient } from '@/api/clients/orders.client';
import { ProductsClient } from '@/api/clients/products.client';
import type { User } from '@/api/schemas/auth.schema';
import type { CreateProductInput, Product } from '@/api/schemas/product.schema';
import data from '@/data/api.json';
import { idOf } from '@/api/typed-response';
import { env } from '@/utils/env';

export interface ApiClients {
  auth: AuthClient;
  products: ProductsClient;
  cart: CartClient;
  orders: OrdersClient;
  adminProducts: AdminProductsClient;
}

/** Seeded accounts. Add a role here and it is available to `tokenFor` everywhere. */
const ROLE_CREDENTIALS = {
  customer: () => ({ email: env.API_USER_EMAIL, password: env.API_USER_PASSWORD }),
  admin: () => ({ email: env.API_ADMIN_EMAIL, password: env.API_ADMIN_PASSWORD }),
} as const;
export type Role = keyof typeof ROLE_CREDENTIALS;

export interface RegisteredUser {
  /** Clients authenticated as this user. */
  clients: ApiClients;
  user: User;
}

export interface ApiFixtures {
  /** The page pw-api-plugin draws its cards on. Only defined when `API_LOG=ui`; no browser starts otherwise. */
  apiLogPage: Page | undefined;
  /** Anonymous clients: public endpoints and 401 cases. */
  api: ApiClients;
  /** Clients sending `Authorization: Bearer <token>`. Contexts are disposed after the test. */
  apiWithToken: (token: string) => Promise<ApiClients>;
  /** Seeded customer. READ-ONLY: its state is shared by every worker and every run. */
  authedApi: ApiClients;
  /** Seeded admin. Only mutate resources the test created itself, and delete them afterwards. */
  adminApi: ApiClients;
  /** Registers a brand-new customer with a private cart, orders, wishlist and addresses. */
  registerUser: () => Promise<RegisteredUser>;
  /** One fresh customer for the test: use it for anything that mutates per-user state. */
  newUserApi: RegisteredUser;
  /**
   * Creates a catalog product as admin (unique name) and returns the typed response.
   * Every product it creates is deleted after the test, even when the test fails.
   */
  createProduct: (input: CreateProductInput) => ReturnType<AdminProductsClient['create']>;
  /** A throwaway product owned by the test: use it for anything that consumes stock or touches ratings. */
  tempProduct: Product;
}

export interface ApiWorkerFixtures {
  /** Logs in lazily, once per role and worker; roles no test asks for never log in. */
  tokenFor: (role: Role) => Promise<string>;
}

const createClients = (context: ApiRequest): ApiClients => ({
  auth: new AuthClient(context),
  products: new ProductsClient(context),
  cart: new CartClient(context),
  orders: new OrdersClient(context),
  adminProducts: new AdminProductsClient(context),
});

export const apiFixture = base.extend<ApiFixtures, ApiWorkerFixtures>({
  // Playwright starts what a fixture destructures, so the browser only exists when the `page` variant is picked.
  apiLogPage:
    env.API_LOG === 'ui'
      ? async ({ page }, use) => {
          await use(page);
        }
      : async ({}, use) => {
          await use(undefined);
        },

  api: async ({ request, apiLogPage }, use) => {
    await use(createClients(withApiLog(request, apiLogPage)));
  },

  // Never logged: worker scope has no page, and these are the seeded credentials, which must not reach a report.
  tokenFor: [
    async ({}, use) => {
      const context = await request.newContext({ baseURL: env.API_BASE_URL });
      const tokens = new Map<Role, Promise<string>>();

      const login = async (role: Role): Promise<string> => {
        const { email, password } = ROLE_CREDENTIALS[role]();
        const response = await new AuthClient(context).login(email, password);
        if (!response.ok()) {
          throw new Error(`API login failed for role "${role}": ${response.status()} ${await response.text()}`);
        }
        return (await response.data()).token;
      };

      await use((role) => {
        const cached = tokens.get(role);
        if (cached) return cached;
        // A failed login is not cached: the next test in this worker tries again.
        const pending = login(role).catch((error: unknown) => {
          tokens.delete(role);
          throw error;
        });
        tokens.set(role, pending);
        return pending;
      });
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  apiWithToken: async ({ apiLogPage }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (token) => {
      const context = await request.newContext({
        baseURL: env.API_BASE_URL,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
      contexts.push(context);
      return createClients(withApiLog(context, apiLogPage));
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },

  authedApi: async ({ tokenFor, apiWithToken }, use) => {
    await use(await apiWithToken(await tokenFor('customer')));
  },

  adminApi: async ({ tokenFor, apiWithToken }, use) => {
    await use(await apiWithToken(await tokenFor('admin')));
  },

  registerUser: async ({ api, apiWithToken }, use) => {
    await use(async () => {
      const id = randomUUID();
      const response = await api.auth.register({
        email: `pw-${id}@example.com`,
        password: `Pw1-${id}`,
        name: `Playwright ${id.slice(0, 8)}`,
      });
      if (response.status() !== 201) {
        throw new Error(`User registration failed: ${response.status()} ${await response.text()}`);
      }
      const { token, user } = await response.data();
      return { clients: await apiWithToken(token), user };
    });
  },

  newUserApi: async ({ registerUser }, use) => {
    await use(await registerUser());
  },

  createProduct: async ({ adminApi }, use) => {
    const createdIds: string[] = [];
    await use(async (input) => {
      const name = `${input.name} ${randomUUID().slice(0, 8)}`;
      const response = await adminApi.adminProducts.create({ ...input, name });
      // Track the id before the caller asserts anything, so a failed assertion cannot leak the product.
      // Read the id without validating the body: a product whose payload drifted must still be deleted.
      const id = await idOf(response);
      if (response.status() === 201 && id) createdIds.push(id);
      return response;
    });

    const results = await Promise.allSettled(createdIds.map((id) => adminApi.adminProducts.delete(id)));
    // 404 is fine: the test may have deleted its own product.
    const leaked = createdIds.filter((_, i) => {
      const result = results[i];
      return result.status === 'rejected' || ![204, 404].includes(result.value.status());
    });
    if (leaked.length > 0) {
      throw new Error(`Cleanup failed: these products are still in the catalog: ${leaked.join(', ')}`);
    }
  },

  tempProduct: async ({ createProduct }, use) => {
    const response = await createProduct(data.newProduct);
    if (response.status() !== 201) {
      throw new Error(`Product creation failed: ${response.status()} ${await response.text()}`);
    }
    await use(await response.data());
  },
});
