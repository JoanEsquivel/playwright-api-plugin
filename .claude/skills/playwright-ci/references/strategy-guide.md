# CI strategy guide

## Serial vs parallel vs sharded

| Aspect | Serial | Parallel | Sharded |
|---|---|---|---|
| Command | `playwright test --workers=1` | `playwright test` (workers = CPU/2) | `playwright test --shard=i/n` per job |
| Machines | 1 | 1 | n (+1 merge job) |
| Needs isolated tests | no | yes | yes (+ `fullyParallel: true` for balanced shards) |
| Report | single blob → html | single blob → html | n blobs → `merge-reports` → html |
| Best for | rate-limited/stateful targets, debugging order issues | most suites | long suites, multi-browser, release gates |
| Cost | lowest | low | n× minutes, fastest wall-clock |

## Trigger policy

| Event | Run | Why |
|---|---|---|
| `pull_request` | `lint` + parallel `--grep @smoke` | fast feedback, cheap |
| `push` to main | `lint` + parallel full | protect main |
| `schedule` nightly | sharded full (all browsers if needed) | catch drift, long suites |
| `workflow_dispatch` | serial / sharded on demand | debugging, release |

## Blob reports and merging

`blob` reporter writes `blob-report/report-<shard>.zip`. Each shard uploads it as `blob-report-<i>`; the merge job downloads with `pattern: blob-report-*`, `merge-multiple: true`, then `playwright merge-reports --reporter html ./all-blob-reports` produces one `playwright-report/`. Single-job workflows still merge their one blob to keep artifacts uniform.

## Secrets and variables checklist

- Secrets: `API_USER_EMAIL`, `API_USER_PASSWORD`, `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD`
- Variables (optional, default to the values in the workflow): `API_BASE_URL`, `API_SERVER_COMMAND`, `API_SERVER_CWD`, `API_SERVER_READY_URL`, `API_SERVER_REPOSITORY`
- Never echo secrets; never commit `.env`

## Speed levers, in order

1. No browsers: the setup action installs none unless a job asks for them.
2. `@smoke` on PRs.
3. Parallel workers (default) → sharding when > ~10 min.
4. One login per role and worker (`tokenFor`), never per test.
5. Cache the API's own dependencies (`astral-sh/setup-uv` caches by lockfile).
6. `trace: 'on-first-retry'` (not `'on'`).

## Multi-browser matrix (add to any strategy)

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
env:
  BROWSERS: ${{ matrix.browser }}
steps:
  - uses: ./.github/actions/setup-playwright
    with:
      browsers: ${{ matrix.browser }}
```

The standard config creates `ui-<browser>` / `e2e-<browser>` projects for non-chromium values.
