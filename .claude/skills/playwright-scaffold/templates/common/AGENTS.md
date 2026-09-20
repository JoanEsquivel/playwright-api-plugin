# {{PROJECT_NAME}} — Agent Contract

Playwright test framework following the **Playwright standards kit**. The application under test is a **parameter** read from `.env`; never hard-code it.

## Parameters

| Env var | Meaning |
|---|---|
| `BASE_URL` | UI under test; page object `url`s are relative to it |
| `E2E_USERNAME` / `E2E_PASSWORD` | UI credentials used by `utils/e2e` `login()` and the setup project |
# @api-start
| `API_BASE_URL` | API under test; base for `api/clients/*` |
| `API_USERNAME` / `API_PASSWORD` | API credentials used by the worker-scoped `authToken` fixture |
# @api-end
| `BROWSERS` | Optional `chromium,firefox,webkit` → extra `ui-<b>` / `e2e-<b>` projects |
| `WORKERS` | Optional worker count (`1` = serial) |

Read them only through `utils/env` (`env.BASE_URL`, …). If a value is missing, ask once, then add it to `.env` and `.env.example`.

## Commands

```bash
{{PM}} install && {{PM_EXEC}} playwright install chromium --with-deps
{{PM_RUN}} test            # setup → ui, e2e{{API_COMMANDS_SUFFIX}}
{{PM_RUN}} lint            # blocking gate
{{PM_RUN}} test:debug <spec> && {{PM_EXEC}} playwright-cli attach <session>
{{PM_EXEC}} playwright-cli open <url>       # live browser: snapshot, click, fill, eval, close
```

## Layout

```
pages/       Page objects: locators (.describe()), load(), waitLoad(), actions. No assertions.
# @api-start
api/         clients/*.client (raw APIResponse) · schemas/*.schema (zod)
# @api-end
utils/       e2e (multi-page flows, bridge guard) · env (typed env access)
fixtures/    page · e2e · api → index.fixtures (mergeTests + toMatchSchema); only spec import
tests/       setup/ · ui/ · api/ · e2e/
data/        *.json test data (never credentials)
.github/     workflows: lint, playwright-parallel · actions/setup-playwright
```

## Non-negotiable rules

1. Assertions live in specs. `pages/**` and `api/**` never call `expect`. (lint)
2. Guards are not assertions: `waitFor()` inside `waitLoad()`, and one bridge `expect` inside a `utils/e2e` flow, wrapped in `test.step`.
3. Specs import `test`/`expect` only from `fixtures/index.fixtures`. (lint)
4. Locators: `getByRole`/`getByLabel` → `[data-test]`/`[data-testid]` → `getByText`; always `.describe()`. Never CSS classes or XPath.
5. Verify locators on the live page with `playwright-cli` before writing or changing them.
6. No `page.goto()` in specs; use `<page>.load()` + `waitLoad()`. (lint)
7. No credentials in code or data files; use `env.*`. (lint)
8. Isolated, deterministic tests: no `waitForTimeout`, no `if` in tests, web-first assertions, tags on every test. (lint)
9. Every page object gets a fixture entry; every client is wired in the api fixture. Orphans are removed on delete.
10. Done = `lint` clean and the targeted `playwright test` run green. Never weaken an assertion; file a bug report instead.

## Choosing a test style

| Situation | Style | Location |
|---|---|---|
| Single page behavior | UI | `tests/ui` |
# @api-start
| Endpoint contract or rule | API | `tests/api` |
# @api-end
| Multi-page journey | E2E | `tests/e2e` |
| Auth once per run | setup | `tests/setup` |

Tags: `@smoke` on every PR, `@regression` on full runs, `@ui`/`@api`/`@e2e` on the describe.

## Skills and agent

Skills in `.claude/skills/` (`playwright-architecture`, `playwright-create-test`, `playwright-fix-test`, `playwright-delete-test`, `playwright-ci`, `playwright-cli`). Agent: `qa-playwright-engineer` (`.claude/agents/qa-playwright-engineer.md`). Usage guide: `docs/agent-guide.md`.
