---
name: playwright-ci
description: Set up or change GitHub Actions for a Playwright framework that follows the kit standards — serial (one worker), parallel (default workers, smoke on PR), or sharded (matrix + blob reports merged) — plus the lint gate and the reusable setup action. Use when asked to "add CI", "run tests in GitHub Actions", "make CI faster", "shard", "run serially", "nightly run", or to change triggers, tags or secrets.
allowed-tools: Bash(ruby:*) Bash(node:*) Bash(pnpm:*) Bash(corepack:*) Bash(npx:*) Bash(gh:*)
---

# CI strategies

Templates in `templates/` are the reference workflows with tokens: `{{BASE_URL}}`, `{{API_BASE_URL}}`, `{{PM}}`, `{{PM_RUN}}`, `{{PM_EXEC}}`, `{{PM_INSTALL_CI}}`. Resolve them from `.env.example`/`AGENTS.md` and the package manager in `package.json` (pnpm → `pnpm`, `pnpm`, `pnpm exec`, `pnpm install --frozen-lockfile`; npm → `npm`, `npm run`, `npx`, `npm ci`; yarn → `yarn`, `yarn`, `yarn`, `yarn install --frozen-lockfile`).

## 1. Pick the strategy (`references/strategy-guide.md`)

| Choose | When |
|---|---|
| **parallel** (default) | suite < ~10 min, tests isolated; PR runs `@smoke`, push runs everything |
| **serial** | target is rate-limited, shares mutable state between tests, or a single test user must not run concurrently |
| **sharded** | suite > ~10 min or many browsers; needs `fullyParallel: true` and the `blob` reporter (already in the standard config) |

Combine: parallel on PR + sharded nightly is the usual enterprise setup. Keep `lint.yml` always.

## 2. Install

1. Ensure `.github/actions/setup-playwright/action.yml` exists (copy `templates/setup-playwright-action.yml`, replace tokens).
2. Copy the chosen workflow(s) from `templates/` to `.github/workflows/`, replace tokens.
3. Confirm `playwright.config` has `fullyParallel: true`, `reporter: CI ? [['blob'], ['github'], ['list']] : …`, `retries: CI ? 2 : 0`, `forbidOnly: !!CI`.
4. Repository settings: secrets `E2E_USERNAME`, `E2E_PASSWORD` (+ `API_USERNAME`, `API_PASSWORD`), optional variables `BASE_URL`, `API_BASE_URL`. With the GitHub CLI: `gh secret set E2E_USERNAME`, `gh variable set BASE_URL --body <url>`.

## 3. Tune

- Tags: PR = `--grep @smoke`; full = no grep; nightly regression = `--grep @regression` or full.
- Shard count: start at 4; raise until per-shard time is ~3–5 min; keep `fail-fast: false`.
- Browsers: add a matrix `browser: [chromium, firefox, webkit]` that sets `BROWSERS=${{ matrix.browser }}` and the action input `browsers: ${{ matrix.browser }}`.
- Serial: `--workers=1`; consider `--project=<one>` per job to regain some parallelism across projects.

## 4. Verify

```bash
ruby -ryaml -e 'YAML.load_file(ARGV[0])' .github/workflows/<file>.yml
gh workflow run "<Workflow name>" && gh run watch      # if the repo is on GitHub and gh is authenticated
```

Report the workflow names, triggers, required secrets/variables and where the HTML report artifact appears.
