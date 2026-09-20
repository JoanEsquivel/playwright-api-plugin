---
name: playwright-ci
description: Set up or change GitHub Actions for a Playwright API test framework that follows the kit standards — serial (one worker), parallel (default workers, smoke on PR), or sharded (matrix + blob reports merged) — plus the lint gate and the reusable setup action. Use when asked to "add CI", "run tests in GitHub Actions", "make CI faster", "shard", "run serially", "nightly run", or to change triggers, tags or secrets.
allowed-tools: Bash(ruby:*) Bash(node:*) Bash(pnpm:*) Bash(corepack:*) Bash(npx:*) Bash(gh:*)
---

# CI strategies

Templates in `templates/` are working workflows for this repository (pnpm, no browsers). Each one provisions the API under test (checkout of the app, its toolchain, its dependencies) and lets Playwright's `webServer` start it from `API_SERVER_COMMAND` / `API_SERVER_CWD` / `API_SERVER_READY_URL`; no step ever backgrounds the server. For another API, change the provisioning steps and the `vars.*` defaults, nothing else.

## 1. Pick the strategy (`references/strategy-guide.md`)

| Choose | When |
|---|---|
| **parallel** (default) | suite < ~10 min, tests isolated; PR runs `@smoke`, push runs everything |
| **serial** | the API is rate-limited, or is a shared environment that cannot take concurrent writes |
| **sharded** | suite > ~10 min; needs `fullyParallel: true` and the `blob` reporter (already in the standard config). Each shard starts its own API, so shards never share state |

Combine: parallel on PR + sharded nightly is the usual enterprise setup. Keep `lint.yml` always.

## 2. Install

1. Ensure `.github/actions/setup-playwright/action.yml` exists (copy `templates/setup-playwright-action.yml`). API-only jobs pass no `browsers` input.
2. Copy the chosen workflow(s) from `templates/` to `.github/workflows/`.
3. Confirm `playwright.config` has `fullyParallel: true`, `reporter: CI ? [['blob'], ['github'], ['list']] : …`, `retries: CI ? 2 : 0`, `forbidOnly: !!CI`.
4. Repository settings: secrets `API_USER_EMAIL`, `API_USER_PASSWORD`, `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD`; optional variables `API_BASE_URL`, `API_SERVER_COMMAND`, `API_SERVER_CWD`, `API_SERVER_READY_URL`, `API_SERVER_REPOSITORY`. With the GitHub CLI: `gh secret set API_USER_EMAIL`, `gh variable set API_BASE_URL --body <url>`. Pull requests from forks get no secrets: the login-based tests fail there with a clear "Missing required environment variable" error.

## 3. Tune

- Tags: PR = `--grep @smoke`; full = no grep; nightly regression = `--grep @regression` or full.
- Shard count: start at 4; raise until per-shard time is ~3–5 min; keep `fail-fast: false`.
- Serial: `--workers=1`.

## 4. Verify

```bash
ruby -ryaml -e 'YAML.load_file(ARGV[0])' .github/workflows/<file>.yml
gh workflow run "<Workflow name>" && gh run watch      # if the repo is on GitHub and gh is authenticated
```

Report the workflow names, triggers, required secrets/variables and where the HTML report artifact appears.
