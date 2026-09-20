# Enhancement plan: request/response cards with `pw-api-plugin`, behind one switch

Plan and step-by-step implementation guide for adding [`pw-api-plugin`](https://github.com/sclavijosuero/pw-api-plugin) (v2.1.0, MIT, by Sebastian Clavijo Suero) to this framework, written so it can be followed live on video.

Every step below was built and run in a throwaway copy of this repository on 2026-09-20 (Playwright 1.63, pnpm 10.17, the example API running locally). The repository itself is unchanged: the implementation is yours to do on camera. Section 9 lists what was verified and what was not.

## 1. What the plugin does

`pw-api-plugin` wraps Playwright's request methods (`pwApi.get`, `post`, `put`, `patch`, `delete`, `head`, `fetch`) and an Axios equivalent (`axiosApi`). For every call it builds an HTML card with the request (body, headers, params, other options) and the response (status, duration, body, headers), and puts that card in up to two places:

| Where | Needs | Plugin switch |
|---|---|---|
| Playwright UI mode and the trace viewer | a browser `page`: the card is drawn with `page.setContent()` | `LOG_API_UI`, **on** unless set to `"false"` |
| HTML report, as one attachment per call | nothing else | `LOG_API_REPORT`, **off** unless set to `"true"` |

`COLOR_SCHEME` picks `light` (default), `dark` or `accessible`.

Things the README does not say, found by reading `dist/src/*.js`:

- `pwApi.*` returns the untouched `APIResponse`. That is why it fits under this framework's `typed()` without changing a spec.
- Every call is wrapped in a `test.step('PW Api Call - GET - <url>')`, so it only works while a test is running.
- `LOG_API_UI` and `LOG_API_REPORT` are read on every call. `COLOR_SCHEME` and the plugin's own `test` export are decided once, when the module is imported.
- The card shows only what was passed in the call's `options`. Headers set on the request context (`extraHTTPHeaders`, where this framework puts the Bearer token) and the `baseURL` are not shown: the card says `orders`, not `http://localhost:8000/api/orders`.
- When logging is on, the plugin calls `response.json()` on any non-empty body. A CSV, PDF or HTML answer makes **the call itself throw** (section 8).
- Request and response bodies are shown verbatim, passwords and tokens included (section 8).
- The card's stylesheet comes from `cdnjs.cloudflare.com`. Without internet the card still renders, without syntax colours.

## 2. The design

### Where it plugs in

The README shows the plugin used directly in specs: `import { pwApi, test } from 'pw-api-plugin'` and `pwApi.get({ request, page }, url)`. Doing that here would break four of this repository's rules at once: specs importing `test` from somewhere other than `@/fixtures/index.fixtures`, requests sent from specs instead of clients, `response.json()` in specs, and a browser `page` in an API-only suite.

Instead the plugin goes **under the clients**, in one new file:

```
spec ──> fixture (api / apiWithToken) ──> withApiLog(context, page?) ──> client ──> typed(request, Schema)
                                              │
                        API_LOG=off  ─────────┤ returns the Playwright context itself; the plugin is never called
                        API_LOG=report|ui ────┘ returns a wrapper whose get/post/… call pwApi.get/post/…
```

Clients keep calling `this.request.get('orders')`. They never learn whether logging is on, the same way they never learn how they are authenticated (rule 6). Specs do not change at all: not one line.

### The switch

One framework variable, `API_LOG`, read through `utils/env.ts` like every other parameter:

| `API_LOG` | What happens | Browser | Plugin variables set for you |
|---|---|---|---|
| `off` (default, also when unset) | Plain Playwright. `withApiLog()` returns the context it was given | no | `LOG_API_UI=false`, `LOG_API_REPORT=false` |
| `report` | One card per request attached to the HTML report | no | `LOG_API_UI=false`, `LOG_API_REPORT=true` |
| `ui` | Same as `report`, and every card is also drawn on a page: visible in `--ui` and in traces | yes (Chromium) | `LOG_API_UI=true`, `LOG_API_REPORT=true` |

Anything else fails fast: `API_LOG must be one of off, report, ui; received "banana".`

Why one variable instead of the plugin's two: the plugin's defaults are UI on and report off, which is the opposite of what an API-only repository wants, and "off" with the native variables still routes every call through the plugin and still adds its steps. `API_LOG=off` bypasses it completely, which makes the before/after comparison honest.

An inline variable beats `.env` (dotenv never overrides what is already set), so for the demo you can leave `.env` alone and switch per command.

### Decisions worth saying out loud in the video

1. **The `page` exists only in `ui` mode.** The `apiLogPage` fixture is chosen when the file loads: in `ui` mode it depends on Playwright's `page`; otherwise it depends on nothing and yields `undefined`. Playwright decides what to start from the parameters a fixture destructures, so `off` and `report` never launch a browser. This is the same trick the plugin's own `test` export uses.
2. **`tokenFor` logins are never logged.** That fixture is worker-scoped: it has no `page`, and it is the one place where the seeded credentials are sent on every run. It keeps using its own plain context, so those passwords never reach a report.
3. **One file knows the plugin.** `api/api-log.ts` is the only importer, enforced by lint. Removing the plugin later is: delete that file's body, `pnpm remove pw-api-plugin`.
4. **`ApiRequest` is a `Pick` of `APIRequestContext`.** Clients are typed against the six verbs they use, so both the real context and the wrapper satisfy the type with no cast, and the existing "no leading slash" lint rule keeps matching because the method names did not change.

## 3. Suggested video flow

| # | Chapter | What to show |
|---|---|---|
| 1 | The problem | `pnpm test`, open the HTML report: green ticks, no idea what was sent or received. Open a test: three steps, no requests |
| 2 | Install | Step 1 |
| 3 | Explore the plugin raw | Step 2: the throwaway spec, the report cards, UI mode, and the CSV failure |
| 4 | Why not use it like that here | Section 2: the four rules it would break |
| 5 | Implement | Steps 3 to 8 |
| 6 | The payoff | Section 6: the same suite with `off`, `report`, `ui`; `git diff --stat tests/` is empty |
| 7 | Honest limits | Section 8 |

## 4. Before you start

```bash
git switch -c feat/pw-api-plugin
pnpm test            # 14 passed: the baseline for the comparison
pnpm lint            # clean
```

The example API must be reachable (`API_SERVER_*` in `.env` starts it when it is down).

`ui` mode needs Chromium. This machine already has it; on a clean one run `pnpm exec playwright install chromium`.

Steps 7 and the optional CI note touch `eslint.config.mjs` and `.github/`. `CLAUDE.md` asks for plan mode before changing those when an agent does the work.

## 5. Step by step

### Step 1. Install

```bash
corepack pnpm add -D pw-api-plugin
```

It brings `axios` and `highlight.js` with it. It does not declare `@playwright/test` as a peer dependency; it resolves this project's copy through pnpm's default hoisting, which worked here without any extra setting.

### Step 2. Explore it raw (throwaway)

Create `tests/api/explore-plugin.spec.ts`. It uses the plugin exactly as its README does, so it **breaks this repository's lint rules on purpose**. Do not commit it.

```ts
// THROWAWAY: the plugin exactly as its README shows it, before it is wired into the framework.
import { expect } from '@playwright/test';
import { pwApi, test } from 'pw-api-plugin';

test.describe('pw-api-plugin, raw', () => {
  test('GET a product list', async ({ request, page }) => {
    const response = await pwApi.get({ request, page }, 'products', { params: { pageSize: 3 } });
    expect(response.status()).toBe(200);
  });

  test('POST a login that fails', async ({ request, page }) => {
    const response = await pwApi.post({ request, page }, 'auth/login', {
      data: { email: 'nobody@example.com', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET a CSV file', async ({ request, page }) => {
    const response = await pwApi.get({ request, page }, 'files/products.csv');
    expect(response.status()).toBe(200);
  });
});
```

```bash
LOG_API_REPORT=true pnpm exec playwright test tests/api/explore-plugin.spec.ts
pnpm report                                                        # cards under each test's attachments
pnpm exec playwright test tests/api/explore-plugin.spec.ts --ui    # cards in the Actions panel
```

Expected: two tests pass and the CSV one fails inside the plugin, before your assertion runs:

```
SyntaxError: Unexpected token 'i', "id,name,pr"... is not valid JSON
    at pwApi.get (…/pw-api-plugin/dist/src/pwApi.js)
```

That is the limitation from section 1 shown live. Then delete the file:

```bash
rm tests/api/explore-plugin.spec.ts
```

### Step 3. The switch in `utils/env.ts`

Above `export const env`:

```ts
const API_LOG_MODES = ['off', 'report', 'ui'] as const;
export type ApiLogMode = (typeof API_LOG_MODES)[number];
```

Inside `env`, after `API_SERVER_READY_URL`:

```ts
  /**
   * Optional: request/response cards from pw-api-plugin.
   * `off` (default) plain Playwright · `report` cards attached to the HTML report · `ui` also drawn in UI mode and traces (starts a browser).
   */
  get API_LOG(): ApiLogMode {
    const value = optionalEnv('API_LOG') ?? 'off';
    const mode = API_LOG_MODES.find((candidate) => candidate === value);
    if (!mode) throw new Error(`API_LOG must be one of ${API_LOG_MODES.join(', ')}; received "${value}".`);
    return mode;
  },
```

`find` narrows the string to the union without a cast.

### Step 4. The one file that knows the plugin: `api/api-log.ts`

```ts
import type { APIRequestContext, Page } from '@playwright/test';
import { pwApi } from 'pw-api-plugin';
import { env } from '@/utils/env';

/**
 * The part of `APIRequestContext` the clients use. Playwright's own context satisfies it,
 * and so does the logged wrapper below, so a client never knows which one it received.
 */
export type ApiRequest = Pick<APIRequestContext, 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head'>;

// pw-api-plugin reads its own switches on every call. API_LOG is the only switch this framework exposes.
process.env.LOG_API_UI = String(env.API_LOG === 'ui');
process.env.LOG_API_REPORT = String(env.API_LOG !== 'off');

/**
 * `API_LOG=off` returns the context untouched: the plugin is never called.
 * Otherwise every request goes through pw-api-plugin, which attaches a request/response card
 * to the HTML report and, when it gets a `page` (`API_LOG=ui`), draws it in UI mode and the trace viewer.
 */
export function withApiLog(request: APIRequestContext, page?: Page): ApiRequest {
  if (env.API_LOG === 'off') return request;
  const target = { request, page };
  return {
    get: (url, options) => pwApi.get(target, url, options),
    post: (url, options) => pwApi.post(target, url, options),
    put: (url, options) => pwApi.put(target, url, options),
    patch: (url, options) => pwApi.patch(target, url, options),
    delete: (url, options) => pwApi.delete(target, url, options),
    head: (url, options) => pwApi.head(target, url, options),
  };
}
```

The parameters of each arrow function are typed by `ApiRequest`, so `url` and `options` need no annotation.

### Step 5. Clients: one type, five files

In every `api/clients/*.client.ts` the constructor takes `ApiRequest` instead of `APIRequestContext`. Nothing else in the class changes.

```diff
-import type { APIRequestContext } from '@playwright/test';
+import type { ApiRequest } from '@/api/api-log';
 …
 export class OrdersClient {
-  constructor(private readonly request: APIRequestContext) {}
+  constructor(private readonly request: ApiRequest) {}
```

`admin-products.client.ts` also imports `APIResponse` for its `delete` method; keep that import:

```ts
import type { APIResponse } from '@playwright/test';
import type { ApiRequest } from '@/api/api-log';
```

### Step 6. Fixtures: `fixtures/api.fixtures.ts`

```diff
-import { test as base, request, type APIRequestContext } from '@playwright/test';
+import { test as base, request, type APIRequestContext, type Page } from '@playwright/test';
+import { withApiLog, type ApiRequest } from '@/api/api-log';
```

```diff
 export interface ApiFixtures {
+  /** The page pw-api-plugin draws its cards on. Only defined when `API_LOG=ui`; no browser starts otherwise. */
+  apiLogPage: Page | undefined;
   /** Anonymous clients: public endpoints and 401 cases. */
   api: ApiClients;
```

```diff
-const createClients = (context: APIRequestContext): ApiClients => ({
+const createClients = (context: ApiRequest): ApiClients => ({
```

```diff
 export const apiFixture = base.extend<ApiFixtures, ApiWorkerFixtures>({
-  api: async ({ request }, use) => {
-    await use(createClients(request));
+  apiLogPage:
+    env.API_LOG === 'ui'
+      ? async ({ page }, use) => {
+          await use(page);
+        }
+      : async ({}, use) => {
+          await use(undefined);
+        },
+
+  api: async ({ request, apiLogPage }, use) => {
+    await use(createClients(withApiLog(request, apiLogPage)));
   },
```

```diff
-  apiWithToken: async ({}, use) => {
+  apiWithToken: async ({ apiLogPage }, use) => {
     …
       contexts.push(context);
-      return createClients(context);
+      return createClients(withApiLog(context, apiLogPage));
```

Leave `tokenFor` exactly as it is (decision 2 in section 2). `authedApi`, `adminApi`, `registerUser`, `newUserApi`, `createProduct` and `tempProduct` are built on `api` and `apiWithToken`, so they are logged without being touched, cleanup requests included.

Checkpoint:

```bash
pnpm lint && pnpm test                 # clean, 14 passed: off is still the default
API_LOG=report pnpm test               # 14 passed
```

### Step 7. Lint gate: only `api/api-log.ts` imports the plugin

In `eslint.config.mjs`, above `export default`:

```js
/** pw-api-plugin stays behind one file, so API_LOG is the only switch and removing the plugin is a one-file change. */
const PLUGIN_ONLY_IN_API_LOG = {
  name: 'pw-api-plugin',
  message: 'Only api/api-log.ts imports pw-api-plugin. Clients and specs get logging through withApiLog() and the API_LOG switch.',
};

const NO_EXPECT_IN_API = {
  name: '@playwright/test',
  importNames: ['expect'],
  message: 'Assertions live in specs. API clients only send requests.',
};
```

Flat config does not merge options of the same rule across blocks: the last matching block wins. So the new path goes into **each** block that already sets `@typescript-eslint/no-restricted-imports`, and one last block gives `api/api-log.ts` the `api/**` rule without it.

```diff
   {
     files: ['**/*.ts'],
-    rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }] },
+    rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths: [PLUGIN_ONLY_IN_API_LOG], patterns: [NO_PARENT_IMPORTS] }] },
   },
```

Specs block:

```diff
           message: 'Spec files import { test, expect } from the fixtures index, never from @playwright/test.',
           allowTypeImports: true,
-        }],
+        }, PLUGIN_ONLY_IN_API_LOG],
```

`api/**` block:

```diff
-        paths: [{
-          name: '@playwright/test',
-          importNames: ['expect'],
-          message: 'Assertions live in specs. API clients only send requests.',
-        }],
+        paths: [NO_EXPECT_IN_API, PLUGIN_ONLY_IN_API_LOG],
```

New last block, after the `fixtures/**` one:

```js
  // ---- The one file allowed to import pw-api-plugin ----
  {
    files: ['api/api-log.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths: [NO_EXPECT_IN_API], patterns: [NO_PARENT_IMPORTS] }] },
  },
```

Prove it fires, then clean up:

```bash
printf "import { pwApi } from 'pw-api-plugin';\nexport const x = pwApi;\n" > tests/api/zz.spec.ts
pnpm exec eslint tests/api/zz.spec.ts    # error: Only api/api-log.ts imports pw-api-plugin…
rm tests/api/zz.spec.ts
```

### Step 8. Scripts, `.env.example`, docs

`package.json`:

```json
"test:log": "API_LOG=report playwright test",
"test:ui": "API_LOG=ui playwright test --ui",
```

The inline `VAR=value` form is for macOS and Linux shells. On Windows set `API_LOG` in `.env` or add `cross-env`.

`.env.example`, in the optional block:

```bash
# API_LOG=off                        # off | report | ui : request/response cards from pw-api-plugin (ui starts a browser)
# COLOR_SCHEME=light                 # light | dark | accessible : theme of those cards
```

Keep the kit in sync with the code (rule 9 and the definition of done):

| File | Change |
|---|---|
| `AGENTS.md` | Parameters table: `API_LOG` row. Layout: `api-log.ts` next to `typed-response.ts`. Commands: `pnpm test:log`, `pnpm test:ui` |
| `docs/decisions.md` | Decision 19, text below |
| `.claude/rules/api.md`, `.claude/rules/fixtures.md` | Clients take `ApiRequest`; contexts are wrapped with `withApiLog()` in fixtures; only `api/api-log.ts` imports the plugin. Then `pnpm sync:agents` |
| `.claude/skills/playwright-architecture/SKILL.md` and `references/api-layer.md` | Layout line for `api/api-log.ts`; client template constructor type |
| `docs/agent-guide.md` | Troubleshooting rows from section 8 |

Decision 19, ready to paste:

```md
## 19. Request/response cards are optional and live under the clients
**Decision:** `pw-api-plugin` is wired in `api/api-log.ts` only. `withApiLog(context, page?)` wraps a request context when `API_LOG` is `report` or `ui` and returns it untouched when `off` (default). Clients are typed against `ApiRequest`, a `Pick` of `APIRequestContext`.
**Why:** Seeing what was sent and received shortens every diagnosis, but the plugin's documented usage (in specs, with its own `test` and a `page`) breaks rules 1 to 3 and needs a browser. Under the clients, no spec changes and no browser starts unless `ui` is asked for.
**Consequences:** `tokenFor` logins are never logged, so seeded credentials stay out of reports. Cards show request and response bodies verbatim: `API_LOG` stays `off` in CI unless the target uses throwaway credentials. The plugin parses every non-empty body as JSON: a client for a non-JSON endpoint must receive the unwrapped context. Lint allows the import only in `api/api-log.ts`.
```

## 6. Demo script: the difference

All three commands run the same 14 tests. `git diff --stat tests/` stays empty throughout.

```bash
# 1. Off: the framework as it was
pnpm test && pnpm report

# 2. Report: cards in the HTML report, still no browser
pnpm test:log && pnpm report

# 3. UI: cards in UI mode, per action
pnpm test:ui

# 4. Trace viewer: cards as page snapshots
API_LOG=ui pnpm exec playwright test tests/api/orders.spec.ts -g "paid order" --trace on
pnpm exec playwright show-trace test-results/<folder>/trace.zip

# 5. Themes
API_LOG=report COLOR_SCHEME=dark pnpm test && pnpm report
```

What was measured on this machine, full suite, 14 tests:

| | `off` | `report` | `ui` |
|---|---|---|---|
| Result | 14 passed | 14 passed | 14 passed |
| Wall time | 1.1 s | 0.9 s | 2.4 s |
| Attachments across the run | 0 | 37 | 37 |
| Steps across the run | 3 | 25 | 25 |
| Browser started | no | no | yes |

The gap between `off` and `report` is run-to-run noise on a suite this small; the cost that matters is the browser in `ui`.

Good test to open on camera: **"should place a paid order from the cart"**. With logging on it shows six calls in order: `POST auth/register`, `POST admin/products`, `POST cart/items`, `POST orders`, `GET cart`, and the `DELETE admin/products/<id>` sent by the `tempProduct` cleanup after the test body ends. That last one is a nice moment: the fixture's teardown is visible for the first time.

In UI mode, click the `page.setContent` line (or the assertion right after a call) in the Actions panel to see that call's card.

Isolation still holds with logging on: `API_LOG=report pnpm exec playwright test --repeat-each 5 --workers 4` gave 70 passed.

## 7. Turning it off, and removing it

- Off: unset `API_LOG` or set it to `off`. Nothing from the plugin runs.
- Remove: make `withApiLog()` return `request` unconditionally and drop the `pwApi` import and the two `process.env` lines, then `pnpm remove pw-api-plugin`. Clients and fixtures keep compiling because `ApiRequest` stays.

## 8. Limits and gotchas

| What | Detail | What to do |
|---|---|---|
| Non-JSON bodies throw | With logging on, the plugin runs `response.json()` on every non-empty body. `GET files/products.csv` fails with `SyntaxError: … is not valid JSON` inside `pwApi.get`. Empty bodies (the 204 from `DELETE admin/products/{id}`) are fine | When a client for `files/*` is added, build it from the unwrapped context in `createClients` (pass both the wrapped and the plain context). Worth an issue or PR upstream |
| Secrets in cards | Bodies are shown verbatim. `auth.spec.ts` sends the seeded customer's password to `auth/login`, and the answer contains a JWT: both appear in the card. `tokenFor` logins do not (they are not logged) | Keep `API_LOG=off` in CI (it is the default, and no workflow sets it). Turn it on only where credentials are throwaway. The plugin has no redaction option |
| Context headers are invisible | The `Authorization` header is set on the context, so the card's Headers tab does not list it. The URL is the relative path | Say it in the video; it is a display limit, the request is correct |
| Extra steps | Each call adds a `PW Api Call - <VERB> - <url>` step to the report, also in `report` mode | None needed; it reads well next to the spec's own `test.step`s |
| `ui` starts a browser | One page per test, a `setContent` per call: 2.4 s against 1.1 s here | Use `ui` to debug, `report` for everyday runs |
| Internet for colours | The card's stylesheet loads from cdnjs | Offline the card is plain but complete |
| `COLOR_SCHEME` | Read once at import | Set it before the run, not from a fixture |
| No peer dependency on `@playwright/test` | Resolved through pnpm's default hoisting | If `hoist=false` is ever set, add a `packageExtensions` entry for `pw-api-plugin` |

## 9. What was verified, and what was not

Verified in the throwaway copy: `pnpm lint` clean (ESLint and `tsc`); 14/14 in each mode; 70/70 with `--repeat-each 5 --workers 4` in `report` mode; 0 attachments with `off` and 37 with `report` (read from the JSON reporter); six `setContent` calls and six `PW Api Call` steps inside the trace of the paid-order test in `ui` mode; the invalid-value error; the lint gate firing in `tests/`, `api/clients/` and `fixtures/`; the raw exploration spec, including the CSV failure.

Not verified: UI mode was not opened interactively (the trace proves the cards are drawn on the page, which is what UI mode displays); the `dark` and `accessible` themes were not looked at; the two new `package.json` scripts were not run as scripts (their commands were); nothing was run on Windows; the GitHub Actions workflows are untouched and still unexecuted.
