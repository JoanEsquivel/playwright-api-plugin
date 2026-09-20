# Failure taxonomy

| Class | Symptoms | Confirm with | Typical fix |
|---|---|---|---|
| **contract** | `data()` / `error()` throws "body that does not match …" with a zod path | `curl` the same request; compare with the schema | Correct the schema from the real payload, if it was wrong from the start. A payload that changed is `api-bug` until confirmed |
| **data** | expected value differs but the response is correct for its inputs | recompute by hand from the request payload | Fix `data/*.json`; derive expected values from inputs and the API's rounding |
| **auth** | 401/403 where 2xx was expected; `API login failed for role …` from a fixture; 404 on every call | login with `curl` using the `.env` values; check for a leading slash in a client path | `.env`, `ROLE_CREDENTIALS`, `tokenFor` / `apiWithToken`; remove the leading slash |
| **isolation** | passes alone, fails with other tests, with `--repeat-each`, or on the second run against the same server | `--workers 1` vs `--workers 4`; diff a seeded record before and after the run | Fresh user (`newUserApi`), throwaway resource (`tempProduct`, `createProduct`), patterns or deltas instead of absolute values |
| **environment** | `ECONNREFUSED`, `Timed out waiting … from config.webServer`, missing env var error from `utils/env` | the URL in `API_SERVER_READY_URL`; run `API_SERVER_COMMAND` by hand in `API_SERVER_CWD` | `.env`, the API's dependencies, restart a stale server |
| **api-bug** | the test and the schema are right (verified with `curl` and against the requirement) but the API behaves differently | reproduce with `curl` only | Bug report (template) under `bug-reports/`; optional `test.fixme('<id>')` |
| **flaky** | intermittent; passes on retry | `--repeat-each=10 --workers 4`; trace of a failing attempt | Remove the shared state or the ordering assumption |

Decision rule: if two classes seem possible, pick the one the evidence proves; never fix two things at once.
