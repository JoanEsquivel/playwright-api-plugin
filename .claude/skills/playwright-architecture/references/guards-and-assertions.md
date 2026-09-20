# Guards and assertions

## The rule

Assertions express the outcome a test verifies. They live only in `tests/**`. Everything else *interacts* and may *guard* readiness.

## The three allowed guards

| Guard | Where | Shape | Purpose |
|---|---|---|---|
| Readiness wait | `pages/*.ts` `waitLoad()` | `await this.anchor.waitFor({ state: 'visible' })` inside `test.step` | Page is usable before actions run |
| Pre-interaction wait | page object action (rare) | `await this.dialog.waitFor({ state: 'visible' })` | An element appears asynchronously before the click it needs |
| Bridge guard | `utils/e2e.ts` flow method | `await expect(nextPage.anchor).toBeVisible()` inside `test.step`, last line of the step | A multi-page flow confirms the transition so the caller can trust the next page |

Anything else that looks like an assertion outside specs is a violation (and lint fails for `pages/**`, `api/**`).

## Choosing the anchor for `waitLoad()`

- Prefer the page heading or the primary call to action.
- Never a spinner, an overlay or a generic container.
- If the anchor exists on several pages (shared header), pick a page-specific element instead.

## Web-first assertions in specs

```ts
await expect(page.heading).toBeVisible();
await expect(page.errorMessage).toHaveText(data.errors.required);
await expect(page.items).toHaveCount(3);
await expect(page.page).toHaveURL(/dashboard$/);
```

Never:

```ts
expect(await locator.isVisible()).toBe(true);   // no retry, races with rendering
await page.waitForTimeout(2000);                // arbitrary sleep
if (await locator.isVisible()) { … }            // hides failures
```

## Soft assertions

Use `expect.soft()` when several independent facts on one screen should all be reported in one run (order summary rows, dashboard widgets). Keep hard `expect` for anything later steps depend on.

## API assertions order

1. `expect(response.status()).toBe(<code>)`
2. `const body: unknown = await response.json(); expect(body).toMatchSchema(Schema)`
3. Business rules on `Schema.parse(body)`

## When a test fails

Never make it pass by loosening the assertion. Reproduce, inspect with `playwright-cli` (`--debug=cli` + `attach`), fix the smallest thing. If the application behavior changed unexpectedly, write a bug report (`playwright-fix-test`).
