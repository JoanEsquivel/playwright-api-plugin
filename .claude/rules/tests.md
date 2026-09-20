---
paths:
  - "tests/**"
---

# Specs (`tests/**`)

- Import only from the fixtures index: `import { test, expect } from '@/fixtures/index.fixtures'`. Never from `@playwright/test` (type imports excepted). Enforced by lint.
- Every other import uses the `@/` alias too (`@/api/schemas/<resource>.schema`, `@/data/api.json`, `@/utils/env`). Never `../`. Enforced by lint.
- Specs live in `tests/api`, one file per resource: `<resource>.spec.ts`.
- `test.describe('<Resource> API', { tag: ['@api'] }, …)`; tag each test `@smoke` or `@regression`.
- Test names: `should <verb> <noun> <qualifier>`.
- Use `test.step` for multi-request flows so reports read like the scenario.
- Assert status first, then `expect(body).toMatchSchema(Schema)`, then business rules on `Schema.parse(body)`. Type the payload as `unknown` before matching. Assert the exact status code observed, never `ok()`.
- Pick the fixture by what the test does: `api` (anonymous, 401 cases), `authedApi` / `adminApi` (seeded accounts, read-only), `newUserApi` / `registerUser()` (anything that mutates per-user state), `tempProduct` / `createProduct(input)` (anything that touches global state), `apiWithToken(token)` (crafted tokens). No `let` + `afterEach` cleanup in specs: cleanup belongs to the fixture that created the resource.
- Tests are isolated and repeatable against a server that is never reset: no order dependence, no `waitForTimeout`, no `if` inside a test, no assertions on absolute shared state. Enforced by `eslint-plugin-playwright` where possible.
- Credentials from `utils/env` (`env.API_USER_EMAIL`); other data from `data/*.json`. Never string literals for credentials. Enforced by lint.
- Never weaken an assertion to make a test pass. If the application is wrong, write a bug report (see `playwright-fix-test`).

```ts
// WRONG
import { test, expect } from '@playwright/test';
test('x', async ({ request }) => { expect((await request.get('/api/orders')).ok()).toBe(true); });

// CORRECT
import { test, expect } from '@/fixtures/index.fixtures';
test('should list the orders of a new customer', { tag: ['@smoke'] }, async ({ newUserApi }) => {
  const response = await newUserApi.clients.orders.list();
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});
```
