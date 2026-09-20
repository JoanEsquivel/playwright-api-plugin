# Failure taxonomy

| Class | Symptoms | Confirm with | Typical fix |
|---|---|---|---|
| **locator** | `locator resolved to 0 elements`, strict-mode violation (2+ elements), wrong element clicked | `snapshot` at the failing step; `find "<name>"` | Update the locator from the snapshot; add `.filter({ hasText })`; keep the property name |
| **timing** | timeout on `waitLoad()` or first action after navigation; passes when run alone | trace timeline; `requests` shows late XHR | Correct anchor in `waitLoad()`; `waitFor()` guard before the interaction; assert the post-condition of the previous step |
| **data** | expected text/count differs but the page looks right | compare `data/*.json` with the live values | Fix data; seed through the API; compute expected values from captured inputs |
| **auth** | redirect to login, 401/403, empty storage state | `.auth/*.json` age; `pnpm test:setup` output | Regenerate storage state; fix `E2E.login()` anchor; fix `authToken` fixture |
| **environment** | `ECONNREFUSED`, missing env var error from `utils/env`, browser not installed | run the command from the error message | `.env`, `playwright install`, network |
| **app-bug** | the test is right (verified in the snapshot and against the requirement) but the app shows different behavior | reproduce manually with `playwright-cli` | Bug report (template); optional `test.fixme('<id>')` |
| **flaky** | intermittent; passes on retry | `--repeat-each=10`; trace of a failing attempt | Remove the race: wait for the specific post-condition, isolate data per test, avoid shared users, disable animations if needed |

Decision rule: if two classes seem possible, pick the one the trace proves; never fix two things at once.
