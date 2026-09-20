# QA agent guide — `qa-playwright-engineer`

How to invoke the agent from Claude Code, GitHub Copilot and Cursor, and which prompts get the best results. The agent applies the API standards in `AGENTS.md` and works for any API: it reads the target and the credentials from `.env`, never from memory.

## 1. Before you start

```bash
cp .env.example .env          # fill API_BASE_URL (with its path prefix) and the API_USER_* / API_ADMIN_* credentials
corepack pnpm install         # no browsers to install
pnpm test                     # starts the API first when the API_SERVER_* variables are set
```

To let Playwright start the API under test, also fill `API_SERVER_COMMAND`, `API_SERVER_CWD` and `API_SERVER_READY_URL`. For this repository's example target that means a checkout of The Test Automation Website next to this one, with `uv sync` run once in its `backend/` folder.

`.claude/settings.json` already allows the agent to run `lint`, `playwright test`, `node scripts/*` and `curl` without permission prompts, and runs ESLint after every file it edits.

## 2. How to invoke

| Tool | Command or gesture |
|---|---|
| Claude Code, interactive | `claude --agent qa-playwright-engineer` (the agent drives the whole session), or in any session just describe a QA task and Claude delegates to it |
| Claude Code, scripted / CI | `claude -p --agent qa-playwright-engineer --permission-mode acceptEdits "<prompt>"` |
| Claude Code, one skill directly | `/playwright-create-test`, `/playwright-fix-test`, `/playwright-delete-test`, `/playwright-ci` |
| GitHub Copilot, VS Code | pick `qa-playwright-engineer` in the chat agent picker, or type `/qa-playwright-engineer <prompt>` |
| GitHub Copilot CLI | `copilot --agent qa-playwright-engineer --prompt "<prompt>"` |
| Cursor | no agent file; `AGENTS.md` and the skills load automatically. Describe the task, or pick a skill from the `/` menu (`/playwright-create-test`) |

The agent always preloads `playwright-architecture` (the standards). It loads the task skill it needs from your prompt, and uses `curl` to observe the live API before it types a schema.

## 3. What the agent needs from you

| Parameter | Where it looks | Give it in the prompt when |
|---|---|---|
| `API_BASE_URL` | `.env`, `.env.example`, `AGENTS.md` | the target differs from `.env` |
| Credential variable names per role | `.env.example`, `AGENTS.md`, `ROLE_CREDENTIALS` in `fixtures/api.fixtures.ts` | the test needs a role that does not exist yet |
| How to start the API | `API_SERVER_*` in `.env` | the API is not running and those variables are empty |
| Package manager | `packageManager` field, lockfile | never, unless it changes |

If something required is missing it asks one question, then continues. State the values up front to skip the question.

## 4. Recommended prompts

### Add API tests for a resource

```
Cover the wishlist: GET wishlist, POST wishlist/{productId}, DELETE wishlist/{productId}. Happy path, 409 when the product is already there, 404 for an unknown product, 401 without a token. Derive the zod schemas from real responses. Tag the happy path @smoke.
```

Expect: probe output (`curl`), `api/schemas/wishlist.schema.ts`, `api/clients/wishlist.client.ts`, the wiring in `createClients`, `tests/api/wishlist.spec.ts` using `newUserApi` (the wishlist is per-user state), new rows in `docs/api-coverage.md`, and the run output including the `--repeat-each 5 --workers 4` isolation check.

### Cover the auth matrix of an endpoint

```
For PATCH admin/orders/{id}/status: 401 without a token, 403 as a customer, 200 as admin for a legal transition, 400 for an illegal one. Create the order with a fresh user first.
```

### Add a role

```
Add a "support" role: credentials come from API_SUPPORT_EMAIL / API_SUPPORT_PASSWORD. Wire it in ROLE_CREDENTIALS, utils/env.ts, .env.example, AGENTS.md and the CI workflow, and expose a supportApi fixture.
```

### Compare the API with its OpenAPI document

```
Compare the running API with its openapi.json for the cart endpoints. List every status code or payload the document gets wrong and record it in docs/api-coverage.md. Do not change any test.
```

### Fix a failing or flaky test

```
tests/api/orders.spec.ts fails on "should place a paid order from the cart". Here is the output: <paste>. Find the root cause first, then apply the smallest fix. Do not change the assertion unless the API behavior really changed.
```

Flaky variant: `It fails only with 4 workers; use --repeat-each to find which shared state leaks.`
Expect: root cause in one sentence, failure class (data / auth / isolation / environment / api-bug / flaky), the diff, and a green `--repeat-each` run. If the API is wrong it writes a bug report under `bug-reports/` instead of patching the test.

### Delete tests safely

```
Delete tests/api/admin-products.spec.ts and anything only it uses. Keep the products client if other specs still need it.
```

Expect: list of removed and edited files, a grep showing zero orphaned references (`createClients`, `data/api.json`, `docs/api-coverage.md`), `lint` and `--list` output.

### CI

```
Set up GitHub Actions: parallel run on pull requests with @smoke only, full suite on push to main, and a nightly sharded run with 4 shards. Add the lint gate.
```

Variant: `The target is rate-limited: run serially with one worker.`
Expect: workflow files, the composite setup action, the list of secrets and variables to configure, and YAML validation output. Each job starts its own copy of the API through `webServer`.

### Conventions and reviews

```
Where should a helper that computes expected order totals live, and how do I share it between specs?
```

```
Review tests/api/orders.spec.ts and api/clients/orders.client.ts against the standards in AGENTS.md. List violations with the rule number and the fix.
```

## 5. Prompt patterns

| Works | Why |
|---|---|
| Name the endpoint (method + path) or the spec file | The agent probes or runs exactly that |
| Say which status codes and business rules to verify | They become the assertions; avoids tests without a clear check |
| Say who the actor is: anonymous, seeded account, fresh user, admin | Picks the right fixture and keeps the test isolated |
| Paste the failing command and output | Skips a reproduction round |
| Ask for root cause before the fix | Prevents loosening a schema to get green |

| Avoid | Why |
|---|---|
| "Write some tests for the API" | No target, no outcome; it will ask |
| Pasting payloads you remember | It must verify against the live API anyway; wrong shapes slow it down |
| "Make the test pass" | It will not weaken assertions; ask for the root cause instead |
| "Use the customer account to place an order" | Seeded accounts are read-only; it will use a fresh user and tell you why |
| Mixing new tests + CI in one sentence | It will do them in order, but one task per prompt is easier to review |

## 6. Reading the report

Every task ends with: files created or modified (paths), the commands it ran with their output, anything observed on the live API that differs from the request or from its OpenAPI document, and next steps. The definition of done is `pnpm lint` clean plus a green targeted `playwright test` run. If a gate could not run, the report says so explicitly instead of claiming success.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| "This command requires approval" in `-p` mode | The command is not in the `.claude/settings.json` allowlist; add a `Bash(...)` pattern or run interactively |
| `Missing required environment variable "X"` | Fill it in `.env` (copy from `.env.example`) |
| Every request answers 404 | A client path starts with `/`, or `API_BASE_URL` lost its prefix. Paths have no leading slash; the base URL keeps `/api/` |
| `Timed out waiting … from config.webServer` | `API_SERVER_CWD` does not point at the API's folder, its dependencies are not installed, or `API_SERVER_READY_URL` is wrong |
| Tests pass alone and fail together | Shared state: a test mutates a seeded account or a seeded record. Move it to `newUserApi` or to a resource it creates itself |
| `API login failed for role "…"` | Wrong credentials in `.env`, or the API was restarted with different seed data |
| `Cannot find module '@/…'` | The `paths` entry in `tsconfig.json` is missing, or the path after `@/` is not relative to the repository root |
| A skill does not show in the `/` menu | Folder name must equal the `name` in `SKILL.md`; in Claude Code run `/reload-plugins` |
| Copilot or Cursor ignore a rule | Regenerate mirrors with `pnpm sync:agents` (the Lint workflow fails when they drift) |
