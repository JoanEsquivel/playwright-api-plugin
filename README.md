# Playwright API Standards

[![Lint](https://github.com/JoanEsquivel/playwright-api-plugin/actions/workflows/lint.yml/badge.svg)](https://github.com/JoanEsquivel/playwright-api-plugin/actions/workflows/lint.yml)
[![Playwright (parallel)](https://github.com/JoanEsquivel/playwright-api-plugin/actions/workflows/playwright-parallel.yml/badge.svg)](https://github.com/JoanEsquivel/playwright-api-plugin/actions/workflows/playwright-parallel.yml)

A Playwright **API-only** test framework built on a fixed set of standards, plus the kit (skills, rules and an agent) that lets a coding agent apply those standards to any API.

- **Typed end to end.** Each client method binds its endpoint to a [zod](https://zod.dev) schema. A spec reads `await response.data()` and gets a validated, fully typed body. No `response.json()`, no casts.
- **Isolated by design.** The suite runs in parallel, repeatedly, against a server that is never reset.
- **Enforced, not suggested.** The rules that can be expressed as ESLint rules are. `pnpm lint` is a blocking gate.
- **No browser.** `pnpm install` downloads none. The one exception is opt-in (`API_LOG=ui`).
- **The API under test is a parameter.** URLs and credentials come from `.env`, never from code.

The example target is the FastAPI backend of [The Test Automation Website](https://github.com/JoanEsquivel/the-test-automation-website). Point `.env` somewhere else and the framework does not change.

## Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
- [Project layout](#project-layout)
- [How a test is built](#how-a-test-is-built)
- [The standards](#the-standards)
- [Choosing a fixture](#choosing-a-fixture)
- [Isolation](#isolation)
- [Seeing what was sent and received](#seeing-what-was-sent-and-received)
- [CI](#ci)
- [Working with coding agents](#working-with-coding-agents)
- [Coverage and bug reports](#coverage-and-bug-reports)
- [Troubleshooting](#troubleshooting)
- [Further reading](#further-reading)

## Quick start

Requirements: Node `>= 20.11` and [Corepack](https://nodejs.org/api/corepack.html) (ships with Node; it provides the pinned pnpm).

```bash
corepack enable
corepack pnpm install          # no browsers to install
cp .env.example .env           # then fill in the credentials, see Configuration
pnpm test
```

To run against the example API, check out [The Test Automation Website](https://github.com/JoanEsquivel/the-test-automation-website) next to this repository and install its backend once (it uses [uv](https://docs.astral.sh/uv/)):

```bash
git clone https://github.com/JoanEsquivel/the-test-automation-website ../the-test-automation-website
(cd ../the-test-automation-website/backend && uv sync)
```

Then uncomment the three `API_SERVER_*` lines in `.env`. `pnpm test` starts the API when it is down and reuses it when it is already up. The seeded account credentials for `.env` are listed in that repository's README, under [Test credentials and fixtures](https://github.com/JoanEsquivel/the-test-automation-website#test-credentials-and-fixtures).

## Configuration

Everything is read through `utils/env.ts` (`env.API_BASE_URL`, …). It is the only file that reads `process.env`, and a missing required variable fails fast with a message that names it.

| Variable | Required | Meaning |
|---|---|---|
| `API_BASE_URL` | yes | API under test, **including its path prefix** (`http://localhost:8000/api/`). Normalised to end with `/` |
| `API_USER_EMAIL` / `API_USER_PASSWORD` | yes | Seeded standard account. Read-only, used by `authedApi` |
| `API_ADMIN_EMAIL` / `API_ADMIN_PASSWORD` | yes | Seeded admin account, used by `adminApi` |
| `API_SERVER_COMMAND` | no | When set, Playwright's `webServer` starts the API with this command |
| `API_SERVER_CWD` | no | Directory that command runs in |
| `API_SERVER_READY_URL` | with `API_SERVER_COMMAND` | URL polled until it answers 2xx, for example the health endpoint |
| `WORKERS` | no | Worker count. `1` runs serially |
| `API_LOG` | no | `off` (default), `report` or `ui`. See [Seeing what was sent and received](#seeing-what-was-sent-and-received) |
| `COLOR_SCHEME` | no | `light`, `dark` or `accessible`. Theme of the `API_LOG` cards, read by the plugin itself |

`.env` is git-ignored. Never commit credentials, and never hard-code any of these values in code, test data or docs.

## Commands

```bash
pnpm test              # the whole suite
pnpm test:smoke        # only @smoke
pnpm test:api          # the api project
pnpm test:log          # the suite with API_LOG=report
pnpm test:ui           # UI mode with API_LOG=ui (needs: pnpm exec playwright install chromium)
pnpm report            # open the last HTML report

pnpm lint              # eslint + tsc --noEmit (blocking gate)
pnpm lint:fix
pnpm sync:agents       # regenerate .cursor/rules and .github/instructions from .claude/rules

# Isolation check for a spec: repeated, in parallel, against one long-lived server
pnpm exec playwright test tests/api/<resource>.spec.ts --repeat-each 5 --workers 4
```

## Project layout

```
api/
  clients/*.client.ts     one class per resource; each method binds its response schema
  schemas/*.schema.ts     zod schemas, inferred types, request input types
  typed-response.ts       typed(request, Schema) → APIResponse + data() + error()
  api-log.ts              optional request/response cards (the only file that imports pw-api-plugin)
fixtures/
  api.fixtures.ts         clients, authentication by role, throwaway data
  index.fixtures.ts       mergeTests; the only import source for specs
utils/env.ts              typed env access
tests/api/*.spec.ts       the specs
data/*.json               test data (never credentials)
docs/                     coverage map, decision log, agent guide, plugin guide
bug-reports/              API defects found while testing
.claude/                  skills, rules and the QA agent
.github/                  workflows (lint, playwright-parallel) and the setup action
```

## How a test is built

Four pieces, each with one job. The excerpts below are from this repository.

**1. Schema** (`api/schemas/product.schema.ts`): derived from a real response captured with `curl`, not from memory or from the OpenAPI document alone.

```ts
export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  // …
});
export type Product = z.infer<typeof ProductSchema>;
```

**2. Client** (`api/clients/admin-products.client.ts`): maps 1:1 to endpoints and declares the contract once with `typed()`. It never asserts, never checks the status, never retries and does not know how it is authenticated, so the same method serves positive and negative tests.

```ts
export class AdminProductsClient {
  constructor(private readonly request: ApiRequest) {}

  async create(input: CreateProductInput) {
    return typed(this.request.post('admin/products', { data: input }), ProductSchema);
  }
}
```

**3. Fixture** (`fixtures/api.fixtures.ts`): every client is wired in `createClients`, and the fixtures decide who is calling: anonymous (`api`), a seeded role (`authedApi`, `adminApi`), a fresh user (`newUserApi`) or a crafted token (`apiWithToken`).

**4. Spec** (`tests/api/admin-products.spec.ts`): status first, then `data()` for the validated typed body, then business rules. Negative cases read `error()`.

```ts
import { test, expect } from '@/fixtures/index.fixtures';
import data from '@/data/api.json';

test.describe('Admin products API', { tag: ['@api'] }, () => {
  test('should forbid a customer token with 403', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.adminProducts.list();
    expect(response.status()).toBe(403);
    const { error } = await response.error();
    expect(error.code).toBe('FORBIDDEN');
  });

  test('should create a product and delete it', { tag: ['@regression'] }, async ({ createProduct }) => {
    const response = await createProduct(data.newProduct);
    expect(response.status()).toBe(201);
    const product = await response.data(); // typed as Product, validated against ProductSchema
    expect(product.rating).toBe(0);
    // …
  });
});
```

When a body does not match its schema, `data()` throws an error with the URL, the status and the zod path, which is usually enough to tell contract drift from a wrong schema.

## The standards

The full contract is [`AGENTS.md`](AGENTS.md); the reasoning behind each rule is in [`docs/decisions.md`](docs/decisions.md).

| # | Rule | Lint |
|---|---|:---:|
| 1 | **Assertions live in specs.** `api/**` never calls `expect` | ✅ |
| 2 | **Clients declare the contract, specs read it.** Every client method returns `typed(request, Schema)`. Specs never call `response.json()` or `JSON.parse`, never import a schema (types only) and never cast a body | ✅ |
| 3 | **Specs import `test`/`expect` only from `@/fixtures/index.fixtures`.** Imports across folders use the `@/` alias, `./` only for a sibling file, never `../` | ✅ |
| 4 | **Request paths have no leading slash** (`'auth/login'`). A leading slash drops the `API_BASE_URL` prefix and every call answers 404 | ✅ |
| 5 | **Observe before you type.** Schemas, status codes and error shapes come from a real response. Where the OpenAPI document and the server disagree, the server wins and [`docs/api-coverage.md`](docs/api-coverage.md) records it | |
| 6 | **Authentication lives in `fixtures/api.fixtures.ts`.** Roles are entries in `ROLE_CREDENTIALS` | |
| 7 | **No credentials in code or data files.** Use `env.*`, or generate them at runtime for registered users | ✅ |
| 8 | **Tests are isolated and repeatable against a server that is never reset.** No `waitForTimeout`, no `if` in tests, no order dependence | partly |
| 9 | **Every client is wired in `createClients`** and every covered endpoint is listed in `docs/api-coverage.md`. Orphans are removed on delete | |
| 10 | **Definition of done:** `pnpm lint` clean and the targeted run green, with output shown. Never weaken an assertion to make a test pass; if the API is wrong, file a bug report | |

Tags: `@api` on the `describe`; `@smoke` (runs on every pull request) or `@regression` (full runs) on each test.

## Choosing a fixture

| The test… | Fixture |
|---|---|
| calls a public endpoint, or checks a 401 | `api` |
| only reads as a seeded account, or checks a 403 | `authedApi` / `adminApi` |
| mutates per-user state (cart, orders, profile) | `newUserApi`; a second actor from `registerUser()` |
| consumes or changes global state (stock, ratings, catalog) | `tempProduct`, or `createProduct(input)` when the create response is what you assert. Both delete what they created, even when the test fails |
| sends a crafted or invalid token | `apiWithToken(token)` |

`tokenFor(role)` logs in lazily, once per role and worker. A role no test asks for never logs in, and a failed login is never cached.

## Isolation

The example API keeps everything in memory and has no reset endpoint: restarting the process is the only reset. A suite that depends on a clean server cannot run in parallel, twice in a row or against a shared environment, so:

- **Seeded accounts are read-only.** Their state is shared by every worker and every run.
- **Per-user mutations** use a freshly registered user.
- **Global state** (stock, ratings, catalog) is only touched on a resource the test created, which is deleted afterwards. Headroom is not isolation: a seeded product with a stock of 500 still runs out.
- **Never assert absolute shared state**: order numbers, stock levels, list totals. Match patterns and deltas instead.

The check is `--repeat-each 5 --workers 4` against one long-lived server.

## Seeing what was sent and received

`API_LOG` turns on request/response cards from [`pw-api-plugin`](https://github.com/sclavijosuero/pw-api-plugin), without changing a single spec or client:

| `API_LOG` | Effect |
|---|---|
| `off` (default) | The request context is used untouched; the plugin never runs |
| `report` | Cards are attached to the HTML report. Still no browser |
| `ui` | Cards are also drawn in UI mode and in the trace viewer. Starts a browser: `pnpm exec playwright install chromium` |

The plugin is wired under the clients, in `api/api-log.ts`, and fixtures hand each client a context already wrapped by `withApiLog()`. Things to know:

- **Keep it off in CI.** Cards show request and response bodies verbatim. The login test sends the seeded customer's password through a logged context, so with `API_LOG` on that password and the returned token are in its card. `tokenFor` logins are never logged, so the admin password never reaches a report.
- **The `Authorization` header is not shown.** Cards list the headers passed per call; the Bearer token is set once on the request context by the fixture.
- **Every non-empty body is parsed as JSON.** A client for a non-JSON endpoint (CSV, PDF) must be built from the unwrapped context.

Design and step-by-step record: [`docs/pw-api-plugin-guide.md`](docs/pw-api-plugin-guide.md).

## CI

| Workflow | Runs | Does |
|---|---|---|
| `lint.yml` | push to `main`, pull requests | `pnpm lint`, and fails when the generated agent config is stale |
| `playwright-parallel.yml` | push to `main`, pull requests, manual | Checks out and starts the API under test through `webServer`, runs `@smoke` on pull requests and the full suite otherwise, uploads the HTML report |

The Playwright workflow needs four **repository secrets** (Settings → Secrets and variables → Actions). Without them the run fails with `Missing required environment variable "API_USER_EMAIL"`:

```
API_USER_EMAIL   API_USER_PASSWORD   API_ADMIN_EMAIL   API_ADMIN_PASSWORD
```

With the [GitHub CLI](https://cli.github.com), from a filled-in `.env`:

```bash
for k in API_USER_EMAIL API_USER_PASSWORD API_ADMIN_EMAIL API_ADMIN_PASSWORD; do
  grep -E "^$k=" .env | cut -d= -f2- | tr -d '\n' | gh secret set "$k"
done
```

Optional **repository variables** override the defaults for another target: `API_BASE_URL`, `API_SERVER_COMMAND`, `API_SERVER_CWD`, `API_SERVER_READY_URL`, `API_SERVER_REPOSITORY`. Secrets are not available to pull requests from forks.

## Working with coding agents

The standards are written once and read by Claude Code, GitHub Copilot and Cursor.

| Piece | Location | Purpose |
|---|---|---|
| Contract | [`AGENTS.md`](AGENTS.md) | Always-on rules. `CLAUDE.md` imports it; Copilot and Cursor read it natively |
| Rules | `.claude/rules/*.md` | Load automatically for matching paths. `.cursor/rules` and `.github/instructions` are generated by `pnpm sync:agents`; never edit them by hand |
| Skills | `.claude/skills/` | `playwright-architecture`, `playwright-create-test`, `playwright-fix-test`, `playwright-delete-test`, `playwright-ci`, `playwright-scaffold` |
| Agent | `.claude/agents/qa-playwright-engineer.md` | QA engineer that preloads the standards. `claude --agent qa-playwright-engineer`, or just describe a QA task |
| Enforcement | `eslint.config.mjs`, `Lint` workflow | Instruction files are context; lint is what blocks a merge |

Invocation per tool and recommended prompts: [`docs/agent-guide.md`](docs/agent-guide.md).

> The skills were inherited from a UI + API baseline. The API references describe this repository; the UI references and the scaffold templates still describe the baseline and are not used here.

## Coverage and bug reports

[`docs/api-coverage.md`](docs/api-coverage.md) maps every operation of the example API to its auth requirement and the spec that covers it (12 of 38 so far), and lists where the OpenAPI document and the running server disagree. For example, validation errors are documented as `422` and answered as `400`.

When a test exposes a defect in the API, the test is not patched to pass. The defect is written up under [`bug-reports/`](bug-reports/).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing required environment variable "X"` | Locally: fill it in `.env`. In CI: add the repository secret, see [CI](#ci) |
| Every request answers 404 | A client path starts with `/`, or `API_BASE_URL` lost its prefix |
| `Timed out waiting … from config.webServer` | `API_SERVER_CWD` does not point at the API, its dependencies are not installed, or `API_SERVER_READY_URL` is wrong |
| `API login failed for role "…"` | Wrong credentials, or the API was restarted with different seed data |
| Tests pass alone and fail together | A test mutates a seeded account or record. Move it to `newUserApi` or to a resource it creates |
| `… body that does not match the endpoint's response schema` | Read the zod path, `curl` the endpoint, then fix the schema or file a bug |
| `SyntaxError: … is not valid JSON` from `pwApi.<verb>` | `API_LOG` is on and the endpoint answered a non-JSON body |
| `Executable doesn't exist …` with `API_LOG=ui` | `pnpm exec playwright install chromium` |

The full table is in [`docs/agent-guide.md`](docs/agent-guide.md#7-troubleshooting).

## Further reading

- [`AGENTS.md`](AGENTS.md): the contract
- [`docs/decisions.md`](docs/decisions.md): why each standard exists
- [`docs/api-coverage.md`](docs/api-coverage.md): endpoint → auth → spec
- [`docs/agent-guide.md`](docs/agent-guide.md): using the QA agent
- [`docs/pw-api-plugin-guide.md`](docs/pw-api-plugin-guide.md): the `API_LOG` integration, step by step
