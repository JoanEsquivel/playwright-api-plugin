# Decision log

Short records of the choices behind this framework and kit. Newest last. The kit started as a UI + API baseline; decisions 12–17 record the move to API-only, and the entries they supersede say so.

## 1. TypeScript by default, JavaScript as a supported variant
**Decision:** Standards and templates are written in TypeScript; the `playwright-architecture` skill ships a JS/JSDoc variant and the scaffold script accepts `--lang js`.
**Why:** Typed fixtures and `@typescript-eslint/no-floating-promises` catch the most common agent mistakes (missing `await`, wrong fixture names) before a browser starts.
**Consequences:** `tsc --noEmit` is part of `pnpm lint`; JSON data files are imported directly (CommonJS runtime, no `"type": "module"`).

## 2. Thin action layer; assertions only in specs
**Decision:** `api/**` sends requests and returns raw results. Every `expect` lives in `tests/**`. (In the UI baseline the same rule covered `pages/**`.)
**Why:** A spec should show what is verified without opening other files; clients stay reusable across positive and negative tests.
**Consequences:** Lint forbids `expect` and the `expect` import in that layer.

## 3. The bridge guard exception — not applicable (superseded by 12)
**Decision:** A flow method in `utils/e2e.ts` may contain one `expect` that confirms a page transition, wrapped in `test.step`.
**Why:** Multi-page flows need a hard stop when navigation fails; a `waitFor()` would only time out with a less useful message.
**Consequences:** The guard is documented in-line and is never used to assert a business outcome.

## 4. Clients are fixtures
**Decision:** Every API client is registered in `createClients` (`fixtures/api.fixtures.ts`) and merged in `fixtures/index.fixtures.ts`; specs never instantiate classes.
**Why:** Tests declare what they need as parameters; wiring changes in one place; `mergeTests` keeps concerns separated.
**Consequences:** Adding a client without wiring it is a rule violation caught by the delete/create checklists.

## 5. API clients return `APIResponse`; zod validates in specs — replaced by 18
**Decision:** Clients do not parse or assert. Specs check status, then `expect(body).toMatchSchema(Schema)` and business rules.
**Why:** Keeps clients reusable for negative cases (4xx) and makes contract drift visible with a readable zod error.
**Consequences:** One schema file per resource; the `toMatchSchema` matcher is defined in the fixtures index.

## 6. One agent with preloaded skills
**Decision:** A single `qa-playwright-engineer` agent preloads `playwright-architecture` and routes to task skills. No orchestrator/sub-agent hierarchy.
**Why:** The previous orchestrator + three specialists design duplicated rules in four places, cost extra turns and could not be mirrored to Copilot or Cursor.
**Consequences:** Parallel sub-agents are used only for independent resources (three or more).

## 7. `AGENTS.md` is the portable source of truth
**Decision:** The always-on contract lives in `AGENTS.md`; `CLAUDE.md` imports it; `.github/copilot-instructions.md` points to it; Cursor reads it natively.
**Why:** One file, three tools, no drift.
**Consequences:** Claude-only details stay in `CLAUDE.md` below the import.

## 8. Rules are authored once and mirrored by script
**Decision:** Path-scoped rules live in `.claude/rules/*.md`; `scripts/sync-agent-config.mjs` generates `.cursor/rules/*.mdc` and `.github/instructions/*.instructions.md`.
**Why:** Each tool has its own frontmatter (`paths`, `globs`, `applyTo`); generating avoids hand-maintained copies.
**Consequences:** CI fails if generated files are stale.

## 9. Lint is the enforcement layer
**Decision:** Architecture rules that can be expressed as ESLint rules are; a `PostToolUse` hook runs ESLint after edits in Claude Code; the `Lint` workflow blocks merges.
**Why:** Instruction files are context, not enforcement; any tool can ignore them.
**Consequences:** Some rules (live probe before schemas, read-only seeded accounts, no weakened assertions) remain procedural and are covered by skill checklists.

## 10. Playwright's built-in planner/generator/healer agents are not used
**Decision:** The kit keeps its own skills. Live observation is done with `curl` against the running API.
**Why:** The built-in agents are browser-driven and generate a different structure (specs in markdown, flat tests) that conflicts with these standards.
**Consequences:** No upstream agent artifact is vendored, and `@playwright/cli` is not a dependency.

## 11. Targets are parameters
**Decision:** URLs, credentials, language and package manager are inputs (`.env`, scaffold flags), never constants in skills or templates.
**Why:** The kit must scaffold and maintain frameworks for any application; the example targets exist only to keep this repository runnable.
**Consequences:** `grep` for hard-coded targets is part of the kit's verification.

## 12. API-only
**Decision:** This repository tests an HTTP API and nothing else: one `api` project, no browser, no `pages/`, no storage state, no setup project.
**Why:** The goal is a focused reference for API automation; the UI half of the baseline added concepts (locators, bridge guards, storage state) that do not apply to `request`-based tests.
**Consequences:** `pnpm install` downloads no browser and CI jobs skip the browser cache. The scaffold templates and the UI references inside the skills still describe the baseline and are not used here.

## 13. The base URL carries the prefix; request paths have no leading slash
**Decision:** `API_BASE_URL` includes the path prefix (`…/api/`), `utils/env.ts` normalises it to end with `/`, and clients call `this.request.get('orders')`.
**Why:** With a leading slash Playwright resolves against the host root and silently drops the prefix, so every call answers 404. Keeping the prefix in the parameter also makes `/api/v2` a configuration change.
**Consequences:** A lint rule rejects string and template literals starting with `/` as the first argument of `get/post/put/patch/delete/head/fetch` under `api/**` and `fixtures/**`. Concatenated paths (`'/' + id`) are not caught; template literals are the convention.

## 14. Authentication and roles live in fixtures
**Decision:** `fixtures/api.fixtures.ts` owns all authentication. `tokenFor(role)` is worker-scoped, lazy and memoised; `apiWithToken(token)` builds Bearer clients; `authedApi`, `adminApi`, `registerUser()` and `newUserApi` are built on those two. Roles are entries in `ROLE_CREDENTIALS`.
**Why:** Clients that do not know how they are authenticated can be reused for anonymous, wrong-role and crafted-token cases. A lazy per-role login costs one request per role and worker, and none for roles a run never uses.
**Consequences:** A new role is one registry entry, two env getters and a three-line fixture. A different scheme (cookie, API key, OAuth) changes two fixtures and no client. A failed login is never cached.

## 15. Isolation without a reset endpoint
**Decision:** Seeded accounts are read-only. Tests that mutate per-user state register a fresh user. Tests that consume or mutate global state (stock, ratings, catalog) work on a resource created through a factory fixture (`tempProduct`, `createProduct`) that deletes it afterwards. No test asserts absolute shared state (sequences, stock, list totals).
**Why:** The example API keeps everything in one in-memory store and cannot be reset without a restart; a suite that depends on a clean server cannot run in parallel, twice in a row, or against a shared environment.
**Consequences:** `--repeat-each 5 --workers 4` against one long-lived server is the isolation check, together with confirming that seeded records did not change. The first version of the order tests bought a seeded product with a stock of 500: green, but with a finite number of runs per server process. Headroom is not isolation. Registered users accumulate until the server restarts, which is acceptable for a test target.

## 16. Optional `webServer`, driven by env
**Decision:** `playwright.config.ts` adds `webServer` only when `API_SERVER_COMMAND` is set (`API_SERVER_CWD`, `API_SERVER_READY_URL` complete it). It reuses a running server locally and always starts a fresh one in CI.
**Why:** The framework must work both against an API it can start and against one hosted elsewhere, without app-specific code in the config.
**Consequences:** CI workflows only provision what the command needs (checkout, toolchain, dependencies); they never background the server themselves.

## 17. `@/` import alias
**Decision:** `tsconfig.json` maps `@/*` to the repository root. Imports across folders use it (`@/fixtures/index.fixtures`, `@/api/schemas/auth.schema`, `@/data/api.json`); `./` is allowed only for a sibling file; `../` is forbidden.
**Why:** Relative chains (`../../..`) break when a spec moves and hide where a module lives. Playwright, `tsc` and typescript-eslint all read the same `paths` entry, so the alias needs no extra dependency or build step.
**Consequences:** A lint rule rejects any import starting with `../` in every TypeScript file. One deliberate exception to the wording: `playwright.config.ts` imports `./utils/env` relatively, because the config file is loaded before anything else and should not depend on alias resolution.

## 18. Typed clients: the contract is declared once, the spec reads `data()`
**Decision:** Every client method returns `typed(this.request.<verb>(…), Schema)` (`api/typed-response.ts`): the same `APIResponse`, plus `data()` (body validated against that schema, type inferred with `z.output`) and `error()` (validated error envelope). Specs go status → `await response.data()` → business rules. The `toMatchSchema` matcher and the `const body: unknown = await response.json()` pattern are gone.
**Why:** `response.json()` is `any`. The old pattern was safe but cost three lines per response, made every spec import and choose the schema of every endpoint, and read as if types were missing. Binding the schema where the endpoint is defined makes the type follow the contract automatically, in specs and fixtures alike, and a schema change breaks `tsc` everywhere the field is used.
**Consequences:** Clients still never assert and never look at the status; nothing is validated until a spec or fixture asks, so one method serves positive and negative tests. A contract mismatch surfaces as an `Error` with URL, status and zod path instead of a matcher diff. `api/typed-response.ts` is the only file with `response.json()` and `unknown`; lint rejects `.json()` in `tests/**`. Endpoints without a body return the plain `APIResponse`.

## 19. Request/response cards are optional and live under the clients
**Decision:** `pw-api-plugin` is wired in `api/api-log.ts` only. `withApiLog(context, page?)` wraps a request context when `API_LOG` is `report` or `ui` and returns it untouched when `off` (default). Clients are typed against `ApiRequest`, a `Pick` of `APIRequestContext`.
**Why:** Seeing what was sent and received shortens every diagnosis, but the plugin's documented usage (in specs, with its own `test` and a `page`) breaks rules 1 to 3 and needs a browser. Under the clients, no spec changes and no browser starts unless `ui` is asked for.
**Consequences:** `tokenFor` logins are never logged, so seeded credentials stay out of reports. Cards show request and response bodies verbatim: `API_LOG` stays `off` in CI unless the target uses throwaway credentials. The plugin parses every non-empty body as JSON: a client for a non-JSON endpoint must receive the unwrapped context. Lint allows the import only in `api/api-log.ts`. One deliberate exception to "only `utils/env.ts` touches `process.env`": `api/api-log.ts` writes the plugin's own `LOG_API_UI` / `LOG_API_REPORT`, derived from `env.API_LOG`. Step-by-step record: `docs/pw-api-plugin-guide.md` and the commits on `feat/pw-api-plugin`.

## Appendix — tool compatibility matrix

| Artifact | Claude Code | GitHub Copilot (VS Code / CLI / cloud) | Cursor |
|---|---|---|---|
| `AGENTS.md` | via `@AGENTS.md` in `CLAUDE.md` | native (always-on) | native (always-on) |
| `CLAUDE.md` | native | VS Code reads it | — |
| `.claude/rules/*.md` (`paths`) | native | VS Code reads them; CLI/cloud use the generated `.github/instructions/*.instructions.md` (`applyTo`) | generated `.cursor/rules/*.mdc` (`globs`) |
| `.claude/skills/*/SKILL.md` | native | native (`.claude/skills` is a supported location) | native (`.claude/skills` is a supported location) |
| Agent | `.claude/agents/qa-playwright-engineer.md` (skills preloaded, project memory) | generated `.github/agents/qa-playwright-engineer.agent.md` | no agent files; `AGENTS.md` + skills cover the role |
| Lint hook | `.claude/settings.json` `PostToolUse` | — (rely on `pnpm lint` and the Lint workflow) | — (same) |
| Enforcement | ESLint gates + CI | ESLint gates + CI | ESLint gates + CI |

Generated files carry a `GENERATED` header; `pnpm sync:agents` rewrites them and `node scripts/sync-agent-config.mjs --check` (run by the Lint workflow) fails CI when they drift.
