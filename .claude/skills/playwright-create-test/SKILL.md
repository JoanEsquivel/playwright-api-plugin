---
name: playwright-create-test
description: Add automated API tests to a framework that follows the kit standards — typed client + zod schema + fixture wiring + spec, derived from real responses of the live API. Use when asked to "add tests for", "cover endpoint", "create a client", "write a test for <endpoint|resource|feature>", or "generate tests". Never invents payloads or status codes; observes the live API first.
allowed-tools: Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(curl:*) Bash(node:*)
---

# Create API tests

Follows `playwright-architecture` (preloaded in the agent; read it if not). Resolve parameters from `.env`/`AGENTS.md` first: `API_BASE_URL` (with its prefix), the credential variable names per role, the optional `API_SERVER_*` variables.

## 0. Classify the request

| Input | Path |
|---|---|
| Endpoint or resource (`GET orders`, "wishlist API") | `references/api-flow.md` |
| A journey across endpoints ("register, fill the cart, check out") | same flow; one spec with `test.step` per request, run as `newUserApi` |
| Feature name only | Ask one question: which endpoints, or look for an existing client with that name and for `pending` rows in `docs/api-coverage.md` |

Existing artifacts win: if `api/clients/<name>.client` or a schema exists, extend it instead of creating a new one.

## 1. Steps (summary; details in `references/api-flow.md`)

1. **Probe** the real endpoint with `curl` (token from the login call when needed): status, payload sample, and the auth matrix (no token, wrong role, someone else's resource, unknown id, bad payload). Use a throwaway registered user for probes that write.
2. **Schema** in `api/schemas/<resource>.schema` derived from the sample (zod, non-strict), plus the page/list schema and the input types.
3. **Client** method in `api/clients/<resource>.client` returning `typed(this.request.<verb>(…), <Schema>)`, path without a leading slash; wire a new client in `fixtures/api.fixtures` (`createClients`, `ApiClients`).
4. **Fixture choice** by what the test does to the server (table in `AGENTS.md`). A new kind of throwaway global resource gets a factory fixture next to `createProduct`.
5. **Spec** in `tests/api/<resource>.spec`: status → `await response.data()` → business rules; negatives with `await response.error()` and data from `data/api.json`.
6. **Verify:** `lint` + `playwright test tests/api/<resource>.spec --project=api` + `--repeat-each 5 --workers 4`.
7. **Record:** update the rows in `docs/api-coverage.md`, and its "disagreements" table when the server differs from the OpenAPI document.

## 2. Report

List every file created/modified, the run commands and their output. If the live endpoint differs from the request or from its OpenAPI document (different status, missing field), say so instead of guessing.

## Checklist

- [ ] Status codes and payloads come from a real response captured in this task
- [ ] Client method returns `typed(…, Schema)`; no leading slash; no status checks; wired in `createClients`
- [ ] Spec imports only the fixtures index and data; no `response.json()`, no `: unknown`, no schema import, no `../`
- [ ] Right fixture for the mutation: seeded accounts untouched, per-user state on `newUserApi`, global state on a throwaway resource
- [ ] Tags set; data in `data/*.json`; credentials via `env`
- [ ] `lint` clean, targeted run green, isolation check green, output shown
- [ ] `docs/api-coverage.md` updated
