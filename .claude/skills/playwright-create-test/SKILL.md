---
name: playwright-create-test
description: Add automated tests to a framework that follows the kit standards — UI tests (page object + fixture + spec, from a live scan with playwright-cli), API tests (client + zod schema + fixture + spec, from a real response), or E2E flows. Use when asked to "add tests for", "create a page object", "cover endpoint", "write a test for <URL|route|endpoint|feature>", or "generate tests". Never invents locators or payloads; observes the live target first.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(npm:*) Bash(yarn:*) Bash(curl:*) Bash(node:*)
---

# Create tests

Follows `playwright-architecture` (preloaded in the agent; read it if not). Resolve parameters from `.env`/`AGENTS.md` first: `BASE_URL`, `API_BASE_URL`, credential variable names, language (`ts` unless the project is JS).

## 0. Classify the request

| Input | Path |
|---|---|
| URL or route of a page (`/cart`, `https://…/checkout`) | **UI** → `references/ui-flow.md` |
| Endpoint or resource (`GET /products`, "orders API") | **API** → `references/api-flow.md` |
| A journey across pages ("complete a purchase") | **E2E** → UI flow for each missing page object, then an e2e spec composed from them |
| Feature name only | Ask one question: which page/endpoint, or look for an existing page object/client with that name |

Existing artifacts win: if `pages/<name>` or `api/clients/<name>.client` exists, extend it instead of creating a new one.

## 1. UI path (summary; details in `references/ui-flow.md`)

1. **Live scan gate.** `playwright-cli open <BASE_URL><route>`; if the page redirects to login, authenticate (`state-load .auth/user.json` when the setup project has run, otherwise fill the login form through the CLI). `snapshot`, then `eval "el => el.getAttribute('data-test') ?? el.getAttribute('data-testid')" <ref>` for elements without a usable role/name. `close` when done.
2. **Element inventory** → locator per `references/locator-mapping.md`; pick the `waitLoad()` anchor.
3. **Write/extend** `pages/<page>`, add the fixture entry, add a flow method in `utils/e2e` only for multi-page steps.
4. **Spec** in `tests/ui/<feature>.spec` (or `tests/e2e/`), tags, data in `data/<feature>.json`, credentials from `env`.
5. **Verify:** `lint` + `playwright test tests/ui/<feature>.spec --project=ui`.

## 2. API path (summary; details in `references/api-flow.md`)

1. **Probe** the real endpoint: `curl -s -i "$API_BASE_URL/<path>"` (add auth header from a login call when needed). Capture status and a payload sample.
2. **Schema** in `api/schemas/<resource>.schema` derived from the sample (zod, non-strict).
3. **Client** method in `api/clients/<resource>.client` returning `APIResponse`; wire the client in `fixtures/api.fixtures` (`createClients`, `ApiClients`).
4. **Spec** in `tests/api/<resource>.spec`: status → `toMatchSchema` → business rules; negative case with data from `data/api.json`.
5. **Verify:** `lint` + `playwright test tests/api/<resource>.spec --project=api`.

## 3. Report

List every file created/modified, the run command and its output. If the live page or endpoint differs from the request (missing element, different status), say so instead of guessing.

## Checklist

- [ ] Locators/payloads come from a live snapshot or real response captured in this task
- [ ] Page object: `url`, `.describe()` on every locator, `load()`, `waitLoad()`, action methods only
- [ ] Fixture entry added (page or client); index untouched unless a new fixture file was created
- [ ] Spec imports from the fixtures index; tags set; no `page.goto`; no literal credentials
- [ ] Data in `data/*.json`, credentials via `env`
- [ ] `lint` clean and the targeted run green, output shown
