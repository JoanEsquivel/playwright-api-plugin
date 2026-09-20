# Playwright API Standards — Agent Contract

This repository is a **Playwright API test framework built on a fixed set of standards**, plus the kit that lets a coding agent apply those standards anywhere (`.claude/skills`, `.claude/agents`, `.claude/rules`). The API under test is a **parameter**, never an assumption: this repo's example target is the FastAPI backend of [The Test Automation Website](https://github.com/JoanEsquivel/the-test-automation-website) running locally, configured only through `.env`. No browser is involved.

## Parameters

| Env var | Meaning | Example (this repo) |
|---|---|---|
| `API_BASE_URL` | API under test, **including its path prefix**; normalised to end with `/` | `http://localhost:8000/api/` |
| `API_USER_EMAIL` / `API_USER_PASSWORD` | Seeded standard account, used read-only by `authedApi` | demo customer |
| `API_ADMIN_EMAIL` / `API_ADMIN_PASSWORD` | Seeded admin account, used by `adminApi` | demo admin |
| `API_SERVER_COMMAND` | Optional. When set, Playwright's `webServer` starts the API | `uv run uvicorn app.main:app --port 8000 --log-level warning` |
| `API_SERVER_CWD` | Optional. Directory the command runs in | `../the-test-automation-website/backend` |
| `API_SERVER_READY_URL` | Optional. URL polled until the API is up | `http://localhost:8000/api/health` |
| `WORKERS` | Optional worker count (`1` = serial) | unset |
| `API_LOG` | Optional. Request/response cards from `pw-api-plugin`: `off` (default), `report` (attached to the HTML report), `ui` (also drawn in UI mode and traces; starts a browser) | unset |

Never hard-code these values in code, skills or docs. Read them via `utils/env.ts` (`env.API_BASE_URL`, …). If a task needs a value that is missing, ask for it once, then write it to `.env`/`.env.example`.

## Commands

```bash
corepack pnpm install                     # no browsers to install
pnpm test            # the whole API suite     pnpm test:api | test:smoke
pnpm test:log        # same suite with API_LOG=report     pnpm test:ui (API_LOG=ui, opens UI mode)
pnpm lint            # eslint + tsc (blocking gate)     pnpm lint:fix
pnpm exec playwright test tests/api/<resource>.spec.ts --repeat-each 5 --workers 4   # isolation check
```

With the `API_SERVER_*` variables set, `pnpm test` starts the API when it is down and reuses it when it is up. The example backend keeps everything in memory and has no reset endpoint: restarting the process is the only reset.

## Layout

```
api/         clients/*.client.ts (one class per resource; each method binds its response schema) · schemas/*.schema.ts (zod + input types) · typed-response.ts · api-log.ts (optional request/response cards)
fixtures/    api.fixtures.ts (clients, authentication, throwaway data) · index.fixtures.ts (mergeTests; only import source for specs)
utils/       env.ts (typed env access)
tests/       api/*.spec.ts
data/        *.json test data (never credentials)
docs/        api-coverage.md (endpoint → auth → spec) · agent-guide.md · decisions.md
bug-reports/ API defects found while testing (never patched over in a test)
.github/     workflows: lint, playwright-parallel · actions/setup-playwright
```

## Non-negotiable rules

1. **Assertions live in specs.** `api/**` never calls `expect`. Enforced: `no-restricted-syntax`, `no-restricted-imports`.
2. **Clients declare the contract, specs read it.** Every client method wraps its request in `typed(request, Schema)` (`api/typed-response.ts`). The result is still an `APIResponse`, plus `data()` (body validated against that schema, type inferred) and `error()` (validated error envelope). Clients never look at the status, never assert, never retry. Specs never call `response.json()` or `JSON.parse`, never import a schema (types only) and never annotate or cast a body by hand. The first three are enforced by lint.
3. **Specs import `test`/`expect` only from `@/fixtures/index.fixtures`.** Never from `@playwright/test` (types excepted). Imports across folders use the `@/` alias (repo root, `tsconfig.json` `paths`); `./` only for a sibling file; never `../`. Enforced by lint.
4. **Request paths have no leading slash** (`'auth/login'`). A leading slash drops the `API_BASE_URL` prefix. Enforced by lint.
5. **Observe before you type.** Schemas, status codes and error shapes come from a real response captured with `curl`. The OpenAPI document is a map; where it disagrees with the server, the server wins and `docs/api-coverage.md` records it.
6. **Authentication lives in `fixtures/api.fixtures.ts`.** Clients never know how they are authenticated. Roles are entries in `ROLE_CREDENTIALS`.
7. **No credentials in code or data files.** Use `env.*`, or generate them at runtime for registered users. Enforced by lint (literal args to `login`/`register`).
8. **Tests are isolated and repeatable against a server that is never reset.** Seeded accounts are read-only; per-user mutations use `newUserApi`; anything that touches global state works on a resource the test created (`tempProduct` / `createProduct`), deleted automatically; never assert absolute shared state. No `waitForTimeout`, no `if` in tests, no order dependence.
9. **Every API client is wired in `createClients`** and every covered endpoint is listed in `docs/api-coverage.md`. Orphans are removed on delete.
10. **Definition of done:** `pnpm lint` clean and the targeted `playwright test` run green, with output shown. Never weaken an assertion to make a test pass; if the API is wrong, file a bug report instead.

## Choosing a fixture

| The test… | Fixture |
|---|---|
| calls a public endpoint, or checks a 401 | `api` |
| only reads as a seeded account, or checks a 403 | `authedApi` / `adminApi` |
| mutates per-user state (cart, orders, profile) | `newUserApi`; a second actor from `registerUser()` |
| consumes or changes global state (stock, ratings, catalog) | `tempProduct`, or `createProduct(input)` when the create response is what you assert. Both delete what they created |
| sends a crafted or invalid token | `apiWithToken(token)` |

Tags: `@api` on the describe; `@smoke` (runs on every PR) or `@regression` (full runs) on each test.

## Seeing what was sent and received (`API_LOG`)

`api/api-log.ts` is the only file that imports `pw-api-plugin` (enforced by lint). Fixtures wrap each request context with `withApiLog(context, apiLogPage)`; clients are typed against `ApiRequest` and never know whether they are logged. With `API_LOG` unset or `off` the context is returned untouched and the plugin never runs. `tokenFor` logins are never logged, so the admin password never reaches a report. The login test in `tests/api/auth.spec.ts` sends the seeded customer's password through the logged `api` fixture: with `API_LOG` on, that password and the returned token are in its card. Cards show request and response bodies verbatim, and the plugin parses every non-empty body as JSON: keep `API_LOG` off in CI, and give a client for a non-JSON endpoint the unwrapped context. `API_LOG=ui` is the one case that needs a browser (`pnpm exec playwright install chromium`). `COLOR_SCHEME` (`light`, `dark`, `accessible`) is read by the plugin itself at import, so it has no getter in `utils/env.ts`. Guide: `docs/pw-api-plugin-guide.md`.

## Skills and agent

| Skill | Use when |
|---|---|
| `playwright-architecture` | Any question about structure, conventions, templates (always preloaded in the agent) |
| `playwright-create-test` | Add API tests, clients, schemas, fixtures |
| `playwright-fix-test` | A test fails or is flaky |
| `playwright-delete-test` | Remove tests, clients or schemas safely |
| `playwright-ci` | Add or change GitHub Actions: serial, parallel, sharded |
| `playwright-scaffold` | Create a framework from zero in a new directory |

The skills were inherited from a UI + API baseline. `playwright-architecture/references/api-layer.md` and `playwright-create-test/references/api-flow.md` describe this repository's API-only standards; the UI references and the scaffold templates still describe the baseline and are not used here.

Agent: `qa-playwright-engineer` (`.claude/agents/qa-playwright-engineer.md`, mirrored in `.github/agents/`). Invoke with `claude --agent qa-playwright-engineer` or by asking for any QA task. Usage guide and recommended prompts: `docs/agent-guide.md`.
