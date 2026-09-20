---
name: playwright-architecture
description: The Playwright API testing standards this kit enforces — layout, typed API clients with zod, fixtures and authentication by role, test isolation, assertion placement, import alias, tags. Use for any question about structure or conventions ("how should I structure", "where does X go", "client", "schema", "fixture", "standards"), and before creating, changing or deleting tests. API-agnostic; targets come from .env parameters.
---

# Playwright API Architecture Standards

Language: TypeScript. Runtime values (`API_BASE_URL`, credentials per role, `API_SERVER_*`) are **parameters** read through `utils/env.ts`; nothing in this skill assumes a specific API. No browser is involved.

## Layout

```
api/clients/<res>.client.ts  One class per resource; each method returns typed(request, Schema). No assertions.
api/schemas/<res>.schema.ts  zod schemas + inferred types + request input types. common.schema.ts: error envelope, pageOf().
api/typed-response.ts        typed(): APIResponse + data() / error(). The only place that touches response.json().
utils/env.ts                 Lazy typed getters over process.env (only place that reads it).
fixtures/api.fixtures.ts     api, tokenFor(role) [worker], apiWithToken, authedApi, adminApi, registerUser, newUserApi, createProduct, tempProduct
fixtures/index.fixtures.ts   mergeTests(...) + expect  ← only spec import
tests/api/<res>.spec.ts      specs, one file per resource
data/*.json                  test data, never credentials
docs/api-coverage.md         endpoint → auth → spec, and where the OpenAPI document is wrong
playwright.config.ts         one `api` project; optional webServer from API_SERVER_*
eslint.config.mjs            architecture gates
```

## Rules (summary; full text in `AGENTS.md`, rationale in `references/guards-and-assertions.md` and `docs/decisions.md`)

1. Assertions only in specs. Clients bind a schema and return; fixtures throw plain `Error`s on failed preconditions.
2. Specs import `test`/`expect` from `@/fixtures/index.fixtures` only. Imports across folders use `@/`, siblings `./`, never `../`.
3. Bodies are read with `await response.data()` / `await response.error()`: validated and typed from the client's schema. Never `response.json()`, `: unknown` or a cast in a spec.
4. Request paths have no leading slash; `API_BASE_URL` carries the prefix.
5. Observe before you type: schemas and status codes come from `curl` against the live API, not from the OpenAPI document alone.
6. Authentication lives in `fixtures/api.fixtures.ts`; roles are entries in `ROLE_CREDENTIALS`. Credentials via `env.*`; other data via `data/*.json`.
7. Isolation against a server that is never reset: seeded accounts read-only, per-user mutations on a fresh user, global state on a resource the test created, never assert absolute shared state. No `waitForTimeout`, no conditionals, tags on every test.
8. Every client is wired in `createClients`; every covered endpoint is in `docs/api-coverage.md`; orphans are removed on delete.
9. Done = `lint` clean + targeted run green + isolation check (`--repeat-each 5 --workers 4`).

## Canonical shapes

Client, schema, typed response, fixtures and spec templates: `references/api-layer.md`. The working implementation in `api/`, `fixtures/` and `tests/api/` is the first thing to copy from.

```ts
// api/clients/orders.client.ts — the contract is declared once
async create(input: CheckoutInput) {
  return typed(this.request.post('orders', { data: input }), OrderSchema);
}

// tests/api/orders.spec.ts — status → contract → business rules
test('should place a paid order from the cart', { tag: ['@smoke'] }, async ({ newUserApi, tempProduct }) => {
  await newUserApi.clients.cart.addItem({ productId: tempProduct.id, qty: 2 });
  const response = await newUserApi.clients.orders.create(checkout);
  expect(response.status()).toBe(201);
  const order = await response.data();          // Order, inferred from OrderSchema
  expect(order.status).toBe('paid');
});
```

## File responsibilities

| File | Owns | Must not contain |
|---|---|---|
| `api/clients/*.ts` | one method per endpoint, `typed(request, Schema)` | `expect`, status checks, hosts, leading-slash paths, auth headers |
| `api/schemas/*.ts` | zod schemas, inferred types, input types | requests |
| `api/typed-response.ts` | `data()` / `error()` validation | knowledge of any resource |
| `fixtures/api.fixtures.ts` | client wiring, tokens per role, fresh users, throwaway resources and their cleanup | `expect`, business assertions |
| `fixtures/index.fixtures.ts` | `mergeTests`, `expect` | anything else |
| `tests/**` | `describe`/`step`/`expect`, tags | `@playwright/test` import, `response.json()`, schema imports, `../` imports, literal credentials, `afterEach` cleanup |
| `data/*.json` | inputs, ids, patterns, expected values | credentials |
| `playwright.config.ts` | the `api` project, reporters, optional `webServer` | test logic |

## Decision tables

Which fixture for which test, tag policy: `AGENTS.md` ("Choosing a fixture") and `references/decision-tables.md` (written for the UI + API baseline; only its API rows apply here).

## Common mistakes

- `request.get('/orders')` → drops the `/api` prefix and answers 404. No leading slash.
- `const body: unknown = await response.json()` in a spec → `const order = await response.data()`.
- A client method returning the bare `this.request.get(…)` for an endpoint that has a body → the spec loses its types. Wrap it in `typed(…, Schema)`.
- Placing an order or editing a profile as `authedApi` → the seeded account changes for every other test and run. Use `newUserApi`.
- Buying a seeded product "because it has a lot of stock" → it runs out. Use `tempProduct`.
- `let id` + `afterEach` cleanup in a spec → leaks the resource when an assertion fails first. Put creation and cleanup in a factory fixture.
- Asserting `TAW-2026-0001`, a list `total` or a stock value → absolute shared state. Match a pattern or a delta.
- Copying status codes from the OpenAPI document → it may say 422 where the server answers 400. Probe first.
- Loosening a schema (`.optional()`) or an assertion to make a run pass → investigate; file a bug if the API changed.

## Verification for any change

```bash
pnpm lint
pnpm exec playwright test tests/api/<resource>.spec.ts --project=api
pnpm exec playwright test tests/api/<resource>.spec.ts --repeat-each 5 --workers 4
```
