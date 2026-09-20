---
name: playwright-fix-test
description: Diagnose and fix a failing or flaky Playwright test without weakening it — reproduce, read the error and trace, classify the failure, inspect the live state with playwright-cli (--debug=cli + attach), apply the smallest fix, rerun. Use when asked to "fix", "why is this failing", "flaky", "broken locator", "test timing out", or after a red run. Reports application bugs instead of patching assertions.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(npm:*) Bash(yarn:*) Bash(curl:*) Bash(node:*)
---

# Fix a failing test

Principle: **the test is evidence, not the problem.** A fix changes a locator, a wait, data or a fixture; it never removes or loosens an assertion to make a run green. If the application behaves differently from what the test expects, write a bug report (`references/bug-report-template.md`) and leave the test failing or mark it with `test.fixme('<bug id>')` when the user agrees.

If `superpowers:systematic-debugging` is available, invoke it first; this skill supplies the Playwright-specific steps.

## 1. Reproduce

```bash
pnpm exec playwright test <spec> --project=<ui|api|e2e> --reporter=list
```

Record: failing test title, error message, the line, and whether it fails every time (`--repeat-each=3`).

## 2. Read the evidence

- Error text: what was expected vs received; locator description (from `.describe()`); timeout value.
- Trace: `test-results/<test-dir>/trace.zip` → `pnpm exec playwright show-trace <path>` (or read the `trace` step list in the HTML report). Look at the last successful action, the DOM snapshot at failure, console errors and failed network calls.
- Screenshot in `test-results/<test-dir>/test-failed-1.png`.

## 3. Classify (`references/failure-taxonomy.md`)

`locator` · `timing` · `data` · `auth` · `environment` · `app-bug` · `flaky`. The class decides the fix; do not edit code before classifying.

## 4. Inspect live (when the evidence is not conclusive)

`references/debug-with-playwright-cli.md`:

```bash
PLAYWRIGHT_HTML_OPEN=never pnpm exec playwright test <spec> --project=<p> --debug=cli   # background; wait for "Debugging Instructions"
pnpm exec playwright-cli attach <session>
pnpm exec playwright-cli pause-at <spec>:<line>
pnpm exec playwright-cli resume
pnpm exec playwright-cli snapshot | console error | requests --filter="/api/" | eval "…"
```

Every CLI action prints the equivalent Playwright code: use it as the fix template. Stop the background run when done.

## 5. Fix the smallest thing

| Class | Change |
|---|---|
| locator | update the locator in the page object (verified in the snapshot), keep `.describe()`, keep the property name |
| timing | make `waitLoad()` anchor correct; add a `waitFor()` guard before the interaction; never `waitForTimeout` |
| data | fix `data/*.json` or the seeding step; move dynamic values to the API seeding pattern |
| auth | regenerate storage state (`pnpm test:setup`); fix `E2E.login()`/`authToken` fixture |
| environment | `.env` values, missing browser, network; document in `readme` if others will hit it |
| app-bug | bug report; no test change (or `test.fixme` with the bug id, on request) |
| flaky | find the race (network, animation, test isolation, shared data); fix root cause; retries are not a fix |

## 6. Verify

```bash
pnpm lint
pnpm exec playwright test <spec> --project=<p> --repeat-each=3
```

Show the output. Then run the full project the spec belongs to once.

## 7. Report and remember

Report: root cause (one sentence), class, files changed, evidence (before/after run output). Record a non-obvious learning (selector pattern, auth quirk) in the agent memory so the next fix is faster.

## Never

- Replace `toHaveText` with `toContainText`, `toBeVisible` with a truthy check, or delete an `expect` to pass.
- Add `retries`, `test.slow()`, `waitForTimeout`, or `try/catch` around actions to hide instability.
- Change the test to match a broken application.
