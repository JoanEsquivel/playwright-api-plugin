---
paths:
  - "fixtures/**"
  - "utils/**"
---

# Fixtures and env (`fixtures/**`, `utils/**`)

- `fixtures/api.fixtures.ts` owns every client and all authentication: `apiLogPage`, `api`, worker-scoped `tokenFor(role)`, `apiWithToken(token)`, `authedApi`, `adminApi`, `registerUser()`, `newUserApi`, `createProduct(input)`, `tempProduct`. New clients go in `ApiClients` + `createClients`; new roles go in `ROLE_CREDENTIALS`.
- `fixtures/index.fixtures.ts`: `mergeTests(...)` plus the re-exported `expect` (custom matchers, if ever needed, go here). No other logic. It is the only import source for specs.
- Fixtures read bodies through `response.data()` like specs do; they never call `response.json()` or `JSON.parse` (enforced by lint). For cleanup bookkeeping, `idOf(response)` reads the id of a created resource without validating the rest of the body.
- Every context that reaches `createClients` goes through `withApiLog(context, apiLogPage)` (`api/api-log.ts`); with `API_LOG=off` that is the context itself. `apiLogPage` depends on Playwright's `page` only when `API_LOG=ui`, so no browser starts otherwise. The exception is `tokenFor`: it logs in on a plain context, so those logins (the admin password among them) never reach a report. A spec that logs in through `api` is logged like any other request.
- `utils/env.ts`: the only place that reads `process.env` (besides `CI`/`WORKERS` in the config; `api/api-log.ts` only writes the plugin's `LOG_API_UI` / `LOG_API_REPORT` from `env.API_LOG`). Add a lazy getter per new variable and document it in `.env.example` and `AGENTS.md`. `API_BASE_URL` is normalised to end with `/`.
- Imports across folders use the `@/` alias (`@/api/clients/<resource>.client`, `@/utils/env`); `./api.fixtures` for the sibling. Never `../`. Enforced by lint.
- `tokenFor` never caches a failed login: the rejected promise is evicted so the next test retries.
- Fixture setup failures throw plain `Error`s with actionable messages (for example a failed API login or registration); they do not use `expect`.
- Worker scope for expensive, shareable, read-only state (tokens); test scope for anything a test may mutate (registered users, request contexts).
- Every `APIRequestContext` a fixture creates is disposed after `use`, and every server-side resource a fixture creates is deleted after `use`. A factory records the id (with `idOf`) before it returns, so neither a failing assertion nor a drifted payload can leak the resource; its teardown uses `Promise.allSettled` and fails loudly when a delete does not answer 204 or 404.

```ts
// CORRECT: a new role-bound fixture is one line on top of tokenFor + apiWithToken
supportApi: async ({ tokenFor, apiWithToken }, use) => {
  await use(await apiWithToken(await tokenFor('support')));
},
```
