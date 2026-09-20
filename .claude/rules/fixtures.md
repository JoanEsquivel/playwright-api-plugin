---
paths:
  - "fixtures/**"
  - "utils/**"
---

# Fixtures and env (`fixtures/**`, `utils/**`)

- `fixtures/api.fixtures.ts` owns every client and all authentication: `api`, worker-scoped `tokenFor(role)`, `apiWithToken(token)`, `authedApi`, `adminApi`, `registerUser()`, `newUserApi`, `createProduct(input)`, `tempProduct`. New clients go in `ApiClients` + `createClients`; new roles go in `ROLE_CREDENTIALS`.
- `fixtures/index.fixtures.ts`: `mergeTests(...)` plus `expect = baseExpect.extend({ toMatchSchema })`. No other logic. It is the only import source for specs.
- `utils/env.ts`: the only place that reads `process.env` (besides `CI`/`WORKERS` in the config). Add a lazy getter per new variable and document it in `.env.example` and `AGENTS.md`. `API_BASE_URL` is normalised to end with `/`.
- Imports across folders use the `@/` alias (`@/api/clients/<resource>.client`, `@/utils/env`); `./api.fixtures` for the sibling. Never `../`. Enforced by lint.
- `tokenFor` never caches a failed login: the rejected promise is evicted so the next test retries.
- Fixture setup failures throw plain `Error`s with actionable messages (for example a failed API login or registration); they do not use `expect`.
- Worker scope for expensive, shareable, read-only state (tokens); test scope for anything a test may mutate (registered users, request contexts).
- Every `APIRequestContext` a fixture creates is disposed after `use`, and every server-side resource a fixture creates is deleted after `use`. A factory records the id before it returns, so a failing assertion in the test cannot leak the resource.

```ts
// CORRECT: a new role-bound fixture is one line on top of tokenFor + apiWithToken
supportApi: async ({ tokenFor, apiWithToken }, use) => {
  await use(await apiWithToken(await tokenFor('support')));
},
```
