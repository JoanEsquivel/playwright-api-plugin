# UI flow — from live page to spec

## A. Scan

```bash
playwright-cli open <BASE_URL><route>          # or: playwright-cli open <BASE_URL> then fill login refs
playwright-cli snapshot                         # yields refs like e12 [button "Checkout"]
playwright-cli eval "el => el.getAttribute('data-test') ?? el.getAttribute('data-testid')" e12
playwright-cli eval "() => [...document.querySelectorAll('[data-test],[data-testid]')].map(e => e.dataset.test ?? e.dataset.testid).filter((v,i,a) => a.indexOf(v) === i).join(' | ')"
playwright-cli screenshot --filename=<page>.png # optional visual reference
playwright-cli close
```

Authenticated pages: after `pnpm test:setup`, run `playwright-cli state-load .auth/user.json` before `open`, or log in through the CLI (`fill` + `click` on the login refs) once and continue in the same session.

Auth detection: if `open <route>` lands on the login page (URL `/` or a `textbox "Username"` in the snapshot), the page requires auth → spec goes to `tests/ui` with the project's storage state (default) and no `test.use({ storageState })` override.

## B. Inventory

Record for each testable element: role, accessible name, `data-test`/`data-testid`, purpose. Testable = inputs (`textbox`, `combobox`, `checkbox`, `radio`, `switch`), actions (`button`, `link`, `menuitem`, `tab`), landmarks (`heading`, `alert`, `status`, `img` with alt). Skip `generic` nodes unless they carry a test id.

Answer before coding: primary user action on the page; the 2–5 flows worth testing (happy path, validation, empty state, edge); standalone page or step in a journey.

## C. Names

Route `/checkout-step-one.html` → file `pages/checkout-step-one.ts`, class `CheckoutStepOnePage`, fixture `checkoutStepOnePage`, spec `tests/ui/checkout-step-one.spec.ts`.

## D. Page object

Use the canonical shape from `playwright-architecture` (SKILL.md). One property per element from the inventory, locators per `locator-mapping.md`, `waitLoad()` anchored on the heading or primary action. Actions: one per user interaction, all data as parameters, no assertions.

## E. Fixture

`fixtures/page.fixtures.ts`: import, `PageFixtures` entry, `base.extend` entry. The index picks it up automatically.

## F. Flow (only for journeys)

Add a method to `utils/e2e.ts` when the same 3+ page actions repeat across specs or a step crosses pages. Compose from page-object actions; finish with `await next.waitLoad()` and, when the caller must trust the transition, the bridge guard `await expect(next.anchor).toBeVisible()` inside the step.

## G. Spec

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import data from '../../data/<feature>.json';

test.describe('<Feature>', { tag: ['@ui'] }, () => {
  test.beforeEach(async ({ <pageName> }) => {
    await test.step('Load <PageName> page', async () => {
      await <pageName>.load();
      await <pageName>.waitLoad();
    });
  });

  test('should <verb> <noun> <qualifier>', { tag: ['@smoke'] }, async ({ <pageName> }) => {
    await <pageName>.<action>(data.<key>);
    await expect(<pageName>.<result>).toHaveText(data.expected.<key>);
  });
});
```

Assertion by element: heading/label → `toBeVisible()`/`toHaveText()`; input after fill → `toHaveValue()`; navigation → `toHaveURL(/…/)`; error → `toHaveText(data.errors.x)`; button state → `toBeEnabled()`/`toBeDisabled()`; badge → `toHaveText('N')`; list → `toHaveCount(N)`.

Expected texts go to `data/<feature>.json` (copy them from the live page, not from memory).

## H. Run and fix

```bash
pnpm lint
pnpm exec playwright test tests/ui/<feature>.spec.ts --project=ui
```

| Failure | Likely cause | Fix |
|---|---|---|
| element not found | locator differs from DOM | re-snapshot, update locator |
| `waitLoad` timeout | wrong anchor | pick heading/primary action |
| fixture not found | page not wired | add fixture entry |
| import error | wrong relative path | `tests/<dir>/` → `../../fixtures/index.fixtures` |
| URL mismatch | `url` not relative to `BASE_URL` | fix `url` |
