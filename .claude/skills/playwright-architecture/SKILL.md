---
name: playwright-architecture
description: The Playwright framework standards this kit enforces — layout, page objects, fixtures, flows, API clients with zod, assertions placement, locators, tags. Use for any question about structure or conventions ("how should I structure", "where does X go", "page object", "fixture", "standards"), and before creating, changing or deleting tests. App-agnostic; targets come from .env parameters.
---

# Playwright Architecture Standards

Language: TypeScript by default (`references/js-variant.md` for JavaScript). Runtime values (`BASE_URL`, `API_BASE_URL`, credentials) are **parameters** read through `utils/env.ts`; nothing in this skill assumes a specific application.

## Layout

```
pages/<page>.ts              Page object: locators + load() + waitLoad() + actions. No assertions.
api/clients/<res>.client.ts  One class per resource; methods return APIResponse. No assertions.
api/schemas/<res>.schema.ts  zod schemas + inferred types.
utils/env.ts                 Lazy typed getters over process.env (only place that reads it).
utils/e2e.ts                 Multi-page flows composed from page actions (+ bridge guard).
fixtures/page.fixtures.ts    base.extend<PageFixtures>({ <name>Page: … })
fixtures/e2e.fixtures.ts     e2e flow fixture
fixtures/api.fixtures.ts     api, authedApi, worker-scoped authToken
fixtures/index.fixtures.ts   mergeTests(...) + expect.extend({ toMatchSchema })  ← only spec import
tests/setup/*.setup.ts       auth → storageState
tests/ui|api|e2e/*.spec.ts   specs by style
data/*.json                  test data, never credentials
playwright.config.ts         projects: setup, api, ui[-browser], e2e[-browser]
eslint.config.mjs            architecture gates
```

## Rules (summary; full rationale in `AGENTS.md` and `references/guards-and-assertions.md`)

1. Assertions only in specs. Guards (`waitFor` in `waitLoad()`, one bridge `expect` in a flow) are the only exceptions.
2. Specs import `test`/`expect` from `fixtures/index.fixtures` only.
3. Locators: `getByRole`/`getByLabel` → `[data-test]`/`[data-testid]` → `getByText`; always `.describe()`. Verify on the live page with `playwright-cli` first.
4. `load()` + `waitLoad()` instead of `page.goto()` in specs.
5. Credentials via `env.*`; other data via `data/*.json`.
6. Isolated, deterministic tests: no `waitForTimeout`, no conditionals, web-first assertions, tags on every test.
7. Every page object/client is a fixture; orphans are removed on delete.
8. Done = `lint` clean + targeted run green.

## Canonical shapes (TypeScript)

Page object (`pages/<page>.ts`):

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class <PageName>Page {
  readonly page: Page;
  readonly url = '/<route>';
  readonly heading: Locator;
  readonly primaryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '<Title>' }).describe('<Title> heading');
    this.primaryButton = page.getByRole('button', { name: '<Label>' }).describe('<Label> button');
  }

  async load(): Promise<void> { await this.page.goto(this.url); }

  async waitLoad(): Promise<void> {
    await test.step('Wait for <PageName> page to load', async () => {
      await this.heading.waitFor({ state: 'visible' });
    });
  }

  async <verbNoun>(<param>: string): Promise<void> {
    await this.primaryButton.click();
  }
}
```

Fixture entry (`fixtures/page.fixtures.ts`): add `<pageName>Page: <PageName>Page;` to `PageFixtures` and
`<pageName>Page: async ({ page }, use) => { await use(new <PageName>Page(page)); },` to `base.extend`.

UI spec (`tests/ui/<feature>.spec.ts`):

```ts
import { test, expect } from '@/fixtures/index.fixtures';
import data from '@/data/<feature>.json';

test.describe('<Feature>', { tag: ['@ui'] }, () => {
  test.beforeEach(async ({ <pageName>Page }) => {
    await test.step('Load <PageName> page', async () => {
      await <pageName>Page.load();
      await <pageName>Page.waitLoad();
    });
  });

  test('should <verb> <noun> <qualifier>', { tag: ['@smoke'] }, async ({ <pageName>Page }) => {
    await <pageName>Page.<verbNoun>(data.<key>);
    await expect(<pageName>Page.<resultLocator>).toBeVisible();
  });
});
```

API client + schema + spec: see `references/api-layer.md`. E2E flow, setup and the full set of templates: `references/templates-ts.md`.

## File responsibilities

| File | Owns | Must not contain |
|---|---|---|
| `pages/*.ts` | locators, `load`, `waitLoad`, actions | `expect`, test data, `process.env` |
| `api/clients/*.ts` | HTTP calls returning `APIResponse` | `expect`, parsing, hosts |
| `api/schemas/*.ts` | zod schemas, inferred types | requests |
| `utils/e2e.ts` | multi-page flows, bridge guard | raw locators, `page.goto` |
| `fixtures/*.ts` | wiring, `toMatchSchema` | business logic |
| `tests/**` | `describe`/`step`/`expect`, tags | `page.goto`, `@playwright/test` import, literal credentials |
| `data/*.json` | expected texts, inputs, ids | credentials |
| `playwright.config.ts` | projects, reporters, `baseURL` from env | test logic |

## Decision tables

Which style, page object vs flow, seed via API, storage state vs explicit login, tag policy: `references/decision-tables.md`.

## Common mistakes

- `expect` inside an action method → move it to the spec.
- New class in `pages/` without a fixture entry → not usable as a parameter.
- `page.locator('.btn-primary')` → find the role/label or a `data-test` attribute on the live page.
- `await page.waitForTimeout(2000)` → use a web-first assertion or `waitFor()`.
- `if (await locator.isVisible())` → assert the expected state directly.
- Loosening `toHaveText` to `toContainText` to make a run pass → investigate; file a bug if the app changed.

## Verification for any change

```bash
pnpm lint
pnpm exec playwright test <spec> --project=<ui|api|e2e>
```
