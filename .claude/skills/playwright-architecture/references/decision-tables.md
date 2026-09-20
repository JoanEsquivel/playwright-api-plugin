# Decision tables

## Which test style

| You are verifying… | Style | Location | Fixtures | Typical tags |
|---|---|---|---|---|
| One page: form validation, error text, element states, sorting | UI | `tests/ui` | `<name>Page` | `@ui` + `@smoke`/`@regression` |
| One endpoint: status, schema, business rule, auth behavior | API | `tests/api` | `api`, `authedApi` | `@api` + … |
| A journey across pages (checkout, onboarding) | E2E | `tests/e2e` | page fixtures, storage state | `@e2e` + … |
| "Logged in" precondition for many tests | setup project | `tests/setup` | `e2e` | none |
| UI behavior that needs existing data | E2E with API seeding | `tests/e2e` | `api` + page fixtures | `@e2e` |

## Page object action vs flow method (`utils/e2e.ts`)

| Put it in… | When |
|---|---|
| Page object action | Interaction stays on one page (fill, click, select) |
| Flow method | It crosses pages (login → landing) or repeats the same 3+ page actions across specs |
| The spec | It is the behavior under test, or it needs assertions between steps |

## Locator choice

| Snapshot shows | Use | Fallback |
|---|---|---|
| `button "Label"`, `textbox "Label"`, `link`, `heading`, `checkbox`, `combobox` | `getByRole('<role>', { name: 'Label' })` | `getByLabel('Label')` |
| Only a `data-test`/`data-testid` attribute | `locator('[data-test="value"]')` | — |
| Repeated rows/cards | `locator('[data-test="row"]')` + `.filter({ hasText })` | `getByRole('listitem')` |
| Plain text only | `getByText('text', { exact: true })` | ask for a test id |

Never: CSS classes, generated ids, XPath, nth-child chains.

## Storage state vs explicit login

| Situation | Choice |
|---|---|
| Most tests need an authenticated user | `setup` project saves `storageState`; `ui`/`e2e` projects depend on it |
| A spec must start logged out (login page tests) | `test.use({ storageState: { cookies: [], origins: [] } })` |
| Different roles | One setup test per role writing `.auth/<role>.json`; per-spec `test.use({ storageState })` |
| Session cannot be persisted (CSRF-bound, MFA) | `e2e.login()` in `beforeEach`, keep `@smoke` count low |

## Seeding data

| Need | Do |
|---|---|
| Entity must exist before the UI test | Create it through `api`/`authedApi` in `beforeEach`; delete in `afterEach` |
| Verify a UI action persisted | Act in the UI, assert through the API |
| No API available | Keep the UI path minimal and deterministic; reset state in setup |

## Tags and CI

| Tag | Meaning | Runs on |
|---|---|---|
| `@smoke` | critical path, fast, stable | every PR (`--grep @smoke`) |
| `@regression` | everything else | push to main, nightly |
| `@ui` / `@api` / `@e2e` | style marker on the `describe` | project filters |

## Parallelism

| Suite duration | Strategy |
|---|---|
| < 5 min | parallel (default workers) |
| 5–10 min or shared-state target | serial (`--workers=1`) or per-project jobs |
| > 10 min | sharded (`--shard=i/n`, `fullyParallel: true`, blob + `merge-reports`) |
