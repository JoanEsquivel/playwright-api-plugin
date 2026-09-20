# Debugging with playwright-cli

## Start a paused run

```bash
PLAYWRIGHT_HTML_OPEN=never pnpm exec playwright test tests/ui/login.spec.ts --project=ui --debug=cli
```

Run it in the background and read its output until the "Debugging Instructions" block prints a session name like `tw-a3f19c`. Keep the run alive while you investigate; stop it afterwards.

## Attach and steer

```bash
pnpm exec playwright-cli attach tw-a3f19c
pnpm exec playwright-cli pause-at tests/ui/login.spec.ts:24   # stop right before the failing line
pnpm exec playwright-cli resume                                # run until the pause point
pnpm exec playwright-cli step-over                             # execute the next call
```

## Inspect

```bash
pnpm exec playwright-cli snapshot                     # accessibility tree with refs → compare with the page object locators
pnpm exec playwright-cli find "Place order"           # does the accessible name exist? (--regex for patterns)
pnpm exec playwright-cli console error                # app errors at that moment
pnpm exec playwright-cli requests --filter="/api/"    # failed or slow calls behind the UI state
pnpm exec playwright-cli eval "el => el.getAttribute('data-test')" e12
pnpm exec playwright-cli screenshot --filename=debug-state.png
```

For intermittent failures: `tracing-start` after attaching, `pause-at` the suspicious line, inspect, `tracing-stop`, then open the trace.

## Turn findings into the fix

Each CLI action prints the Playwright code it executed (`await page.getByRole('button', { name: 'Place order' }).click();`). Copy the locator into the page object property that failed. Rerun the spec without `--debug=cli`.

## API tests

No browser: reproduce with `curl -s -i` using the same path/params/headers the client sends (print them from the test with `console.log(response.url())` temporarily), compare status and body with the schema, fix the client/schema/data, remove temporary logs.
