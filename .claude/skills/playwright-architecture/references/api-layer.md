# API layer

Working reference implementation: `api/`, `fixtures/api.fixtures.ts`, `tests/api/` in this repository. Copy from there first; the templates below are the generic shape.

Imports: `@/` is the repository root (`tsconfig.json` `paths`; Playwright, `tsc` and ESLint all resolve it). Use it for anything in another folder, `./` only for a sibling in the same folder, never `../`. Enforced by lint.

## Client (`api/clients/<resource>.client.ts`)

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Create<Resource>Input } from '@/api/schemas/<resource>.schema';

export interface <Resource>ListParams { page?: number; pageSize?: number }

export class <Resource>Client {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: <Resource>ListParams = {}): Promise<APIResponse> {
    return this.request.get('<resources>', { params: { ...params } });
  }

  async getById(id: string): Promise<APIResponse> {
    return this.request.get(`<resources>/${id}`);
  }

  async create(payload: Create<Resource>Input): Promise<APIResponse> {
    return this.request.post('<resources>', { data: payload });
  }
}
```

Rules: typed inputs, raw `APIResponse` out, no `expect`, no `throw`, no host.

**No leading slash in paths.** `API_BASE_URL` carries the prefix (`http://host/api/`, normalised by `utils/env.ts` to end with `/`). `request.get('/orders')` resolves against the host root and silently drops `/api`; `request.get('orders')` keeps it. Lint rejects the leading slash in `api/**`.

## Schema (`api/schemas/<resource>.schema.ts`)

```ts
import { z } from 'zod';

export const <Resource>Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
});
export type <Resource> = z.infer<typeof <Resource>Schema>;

export interface Create<Resource>Input { name: string }
```

Shared shapes live in `api/schemas/common.schema.ts`: `ErrorResponseSchema` (the API's error envelope) and `pageOf(<Resource>Schema)` (the pagination envelope). Reuse them; do not redeclare per resource.

Derive from a real response (`curl -s "${API_BASE_URL}<resources>/<id>" | head -c 2000`). Keep objects non-strict. Add `.optional()` / `.nullable()` only when a real payload shows it. The OpenAPI document helps you find endpoints, but the running API decides status codes and shapes.

## Fixtures (`fixtures/api.fixtures.ts`)

| Fixture | Scope | Use it for |
|---|---|---|
| `api` | test | Anonymous clients: public endpoints, 401 cases |
| `tokenFor(role)` | worker | Lazy, memoised login per role. A role no test asks for never logs in |
| `apiWithToken(token)` | test | Bearer clients for any token (also crafted/invalid ones); contexts disposed after the test |
| `authedApi` / `adminApi` | test | Seeded accounts. **Read-only**: their state is shared by all workers and runs |
| `registerUser()` / `newUserApi` | test | A brand-new user with private state: every test that mutates per-user data |
| `createProduct(input)` / `tempProduct` | test | A throwaway global resource with a unique name, deleted after the test. `createProduct` returns the raw response (for tests that assert the creation itself); `tempProduct` returns the parsed product |

```ts
const ROLE_CREDENTIALS = {
  customer: () => ({ email: env.API_USER_EMAIL, password: env.API_USER_PASSWORD }),
  admin: () => ({ email: env.API_ADMIN_EMAIL, password: env.API_ADMIN_PASSWORD }),
} as const;
export type Role = keyof typeof ROLE_CREDENTIALS;

tokenFor: [async ({}, use) => {
  const context = await request.newContext({ baseURL: env.API_BASE_URL });
  const tokens = new Map<Role, Promise<string>>();
  const login = async (role: Role) => {
    const { email, password } = ROLE_CREDENTIALS[role]();
    const response = await new AuthClient(context).login(email, password);
    if (!response.ok()) throw new Error(`API login failed for role "${role}": ${response.status()} ${await response.text()}`);
    return AuthResponseSchema.parse(await response.json()).token;
  };
  await use((role) => {
    const cached = tokens.get(role);
    if (cached) return cached;
    // A failed login is not cached: the next test in this worker tries again.
    const pending = login(role).catch((error: unknown) => { tokens.delete(role); throw error; });
    tokens.set(role, pending);
    return pending;
  });
  await context.dispose();
}, { scope: 'worker' }],

adminApi: async ({ tokenFor, apiWithToken }, use) => {
  await use(await apiWithToken(await tokenFor('admin')));
},
```

Scaling rules:

- New resource → client + entry in `ApiClients` / `createClients`. Every fixture picks it up.
- New role → one entry in `ROLE_CREDENTIALS`, two env getters, one three-line fixture.
- Other auth scheme (cookie session, API key, OAuth client credentials) → change `tokenFor` / `apiWithToken` only. Clients never know how they are authenticated.
- Short-lived tokens → keep the expiry next to the cached promise in `tokenFor` and log in again when it has passed.

## Isolation without a reset endpoint

1. Seeded accounts are read-only.
2. Per-user mutations (cart, orders, profile…) run as `newUserApi`; a second actor comes from `registerUser()`.
3. Anything that consumes or mutates global state (stock, ratings, catalog) works on a resource the test created through a factory fixture (`tempProduct`, `createProduct`). The fixture records the id before returning and deletes it after the test, so a failing assertion cannot leak it. Never modify or consume seeded records.
4. Never assert absolute shared state: match order numbers by pattern, never assert list totals, stock or counters.
5. Headroom is not isolation: a seeded product with a large stock still runs out after enough runs. Buy your own product.

A suite that follows these rules passes with `--repeat-each 5 --workers 4` against one long-lived server. Use that as the isolation check.

## Spec (`tests/api/<resource>.spec.ts`)

```ts
import { test, expect } from '@/fixtures/index.fixtures';
import { ErrorResponseSchema } from '@/api/schemas/common.schema';
import { <Resource>Schema } from '@/api/schemas/<resource>.schema';
import data from '@/data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should return a <resource> by id', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.<resource>.getById(data.<resources>.knownId);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(<Resource>Schema);
    expect(<Resource>Schema.parse(body).id).toBe(data.<resources>.knownId);
  });

  test('should reject an anonymous request with 401', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.<resource>.getById(data.<resources>.knownId);
    expect(response.status()).toBe(401);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('UNAUTHORIZED');
  });
});
```

For every protected endpoint cover the auth matrix that applies: no token → 401, wrong role → 403, someone else's resource → the status the API really returns (often 404).

## Config

The single `api` project sets `use.baseURL: env.API_BASE_URL` and no browser. Headers common to every call (`Accept`, API keys) go in that project's `use.extraHTTPHeaders`.

`webServer` is optional: it exists only when `API_SERVER_COMMAND` is set (with `API_SERVER_CWD` and `API_SERVER_READY_URL`). Locally it reuses a server that is already up; in CI it always starts a fresh one. Leave the variables unset for an API hosted elsewhere.
