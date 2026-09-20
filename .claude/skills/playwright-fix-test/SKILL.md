---
name: playwright-fix-test
description: Diagnose and fix a failing or flaky Playwright API test without weakening it — reproduce, read the error and trace, classify the failure, replay the request with curl against the live API, apply the smallest fix, rerun. Use when asked to "fix", "why is this failing", "flaky", "schema mismatch", "401 in setup", "fails only in parallel", or after a red run. Reports API bugs instead of patching assertions.
allowed-tools: Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(curl:*) Bash(node:*)
---

# Fix a failing test

Principle: **the test is evidence, not the problem.** A fix changes a schema that was wrong from the start, test data, a fixture or the isolation of a test; it never removes or loosens an assertion or a schema to make a run green. If the API behaves differently from what the test expects, write a bug report (`references/bug-report-template.md`) under `bug-reports/` and leave the test failing, or mark it with `test.fixme('<bug id>')` when the user agrees.

If `superpowers:systematic-debugging` is available, invoke it first; this skill supplies the Playwright-specific steps.

## 1. Reproduce

```bash
pnpm exec playwright test <spec> --project=api --reporter=list
```

Record: failing test title, error message, the line, and whether it fails every time (`--repeat-each=3`) and only in parallel (`--workers 1` vs `--workers 4`).

## 2. Read the evidence

- Error text: expected vs received status or value. A contract failure comes from `data()` / `error()` and names the URL, the status and the zod path.
- A fixture failure (`API login failed for role …`, `User registration failed …`, `Product creation failed …`) means the precondition broke, not the behavior under test.
- Trace (on retry in CI, or `--trace on` locally): `pnpm exec playwright show-trace test-results/<test-dir>/trace.zip` lists every request with its headers, payload and response.

## 3. Classify (`references/failure-taxonomy.md`)

`contract` · `data` · `auth` · `isolation` · `environment` · `api-bug` · `flaky`. The class decides the fix; do not edit code before classifying.

## 4. Inspect live (when the evidence is not conclusive)

Replay the failing request with `curl`, using the recipe in `playwright-create-test/references/api-flow.md` (token from the login call; a throwaway registered user for anything that writes). Compare status and body with what the test and the schema expect, and with `docs/api-coverage.md`. Check that the server is the one you think it is: the URL in `API_SERVER_READY_URL`.

## 5. Fix the smallest thing

| Class | Change |
|---|---|
| contract | the schema never matched reality: correct it from the real payload. If the payload changed, that is `api-bug` until the change is confirmed as intended |
| data | fix `data/*.json`; compute expected values from the inputs and the API's own rounding instead of hard-coding them |
| auth | `.env` credentials, `ROLE_CREDENTIALS`, `tokenFor` / `apiWithToken` in `fixtures/api.fixtures.ts`; a client path with a leading slash shows up here as 404 on login |
| isolation | the test touches a seeded account or record, or asserts absolute shared state: move it to `newUserApi` / `tempProduct`, or assert a pattern or delta |
| environment | `.env` values, `API_SERVER_*`, the API's own dependencies, a stale server holding old state (restart it) |
| api-bug | bug report; no test change (or `test.fixme` with the bug id, on request) |
| flaky | find the shared state or the ordering assumption; fix the root cause; retries are not a fix |

## 6. Verify

```bash
pnpm lint
pnpm exec playwright test <spec> --project=api --repeat-each=5 --workers 4
```

Show the output. Then run the whole suite once.

## 7. Report and remember

Report: root cause (one sentence), class, files changed, evidence (before/after run output). Record a non-obvious learning (a status code that differs from the docs, state that leaks between tests) in the agent memory so the next fix is faster.

## Never

- Replace an exact status with `ok()`, `toBe` with `toBeCloseTo` or `toContain`, add `.optional()` to a schema, or delete an `expect` to pass.
- Add `retries`, `test.slow()`, `waitForTimeout`, or `try/catch` around requests to hide instability.
- Make a test depend on a freshly restarted server.
- Change the test to match a broken API.
