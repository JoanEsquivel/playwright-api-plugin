---
name: playwright-scaffold
description: Create a new Playwright test framework from zero that follows the kit standards (TypeScript by default, JavaScript on request) in a target directory, wired with config, fixtures, lint gates, CI and the agent kit. Use when asked to "create a framework", "set up Playwright from scratch", "bootstrap a test project" or "scaffold" for any application. Targets, credentials, language and package manager are parameters.
allowed-tools: Bash(node:*) Bash(corepack:*) Bash(pnpm:*) Bash(npm:*) Bash(yarn:*) Bash(npx:*) Bash(playwright-cli:*)
---

# Scaffold a Playwright framework

Generates a runnable project from `templates/` via `scripts/scaffold.mjs`, then finishes the parts that depend on the real application (login flow, API auth) using live observation.

## 1. Collect parameters (ask only for what is missing)

| Parameter | Flag | Default | Notes |
|---|---|---|---|
| Target directory | `--target` | required | New or empty directory (`--force` to write into a non-empty one) |
| UI base URL | `--base-url` | required | Written to `.env.example` and CI defaults |
| API base URL | `--api-base-url` | none | Omit **and** pass `--no-api` when the app has no API to test |
| Language | `--lang ts\|js` | `ts` | JS variant uses `// @ts-check` + JSDoc |
| Package manager | `--pm pnpm\|npm\|yarn` | `pnpm` | Affects scripts, CI and lockfile flags |
| Project name | `--project-name` | folder name | `package.json` name and `AGENTS.md` title |
| Include kit | `--no-kit` to skip | included | Copies `.claude/{rules,skills,agents,settings.json}`, `CLAUDE.md`, `scripts/` so the new project has the agent and rules |

Credentials are never passed as flags; the user fills `.env` after generation.

## 2. Generate

```bash
node <kit>/.claude/skills/playwright-scaffold/scripts/scaffold.mjs \
  --target <dir> --lang ts --pm pnpm \
  --base-url <BASE_URL> --api-base-url <API_BASE_URL>
```

`<kit>` is the repository that contains this skill (or the installed plugin path). The script prints the next steps.

## 3. Install and run the baseline

```bash
cd <dir>
cp .env.example .env          # user fills E2E_USERNAME/E2E_PASSWORD (and API_* if present)
corepack pnpm install         # or npm install / yarn
pnpm exec playwright install chromium --with-deps
pnpm lint
```

## 4. Make authentication real (or remove it)

The templates ship `pages/login.<lang>`, `pages/home.<lang>` and `utils/e2e.<lang>` with generic locators marked `SCAFFOLD`.

- **App has a login:** run the `playwright-create-test` UI flow on the login page (`playwright-cli open <BASE_URL>` → `snapshot` → element inventory) and replace the locators, `url`s and the landing-page anchor. Then `pnpm test:setup` must pass and write `.auth/user.json`.
- **App has no login:** delete `tests/setup/`, `pages/login.<lang>`, the `loginPage` fixture entry and `E2E.login()`; remove `storageState` and `dependencies: ['setup']` from the `ui`/`e2e` projects in the config; drop `E2E_USERNAME`/`E2E_PASSWORD` from `.env.example` and `AGENTS.md`.

For the API layer, adjust `api/clients/auth.client.<lang>`, `api/schemas/auth.schema.<lang>` and the `authToken` fixture to the real auth scheme after probing it (`curl -s -X POST $API_BASE_URL/<login> …`).

## 5. Verify

```bash
pnpm lint
pnpm test          # setup (if any) → ui smoke, api smoke, e2e (empty until create-test adds flows)
```

Both must pass before reporting completion. Show the output.

## 6. Hand-off checklist

- [ ] `.env.example` lists every parameter; `.env` is gitignored and filled by the user
- [ ] `AGENTS.md` in the new project has the real parameters table (no `{{TOKENS}}` left: `grep -rn "{{" .` is empty)
- [ ] `pnpm lint` clean, `pnpm test` green
- [ ] Login/landing locators verified on the live page (no `SCAFFOLD` comments left) or auth removed entirely
- [ ] CI: `lint.yml` and `playwright-parallel.yml` present; add serial/sharded with `playwright-ci` if needed
- [ ] Git initialised and first commit made (`git init && git add -A && git commit -m "chore: scaffold Playwright framework"`), unless the target is already a repository

## What the generated project contains

`playwright.config` (projects `setup`, `api`, `ui`, `e2e`, browser matrix through `BROWSERS`), `utils/env`, `utils/e2e`, `pages/{login,home}`, `fixtures/{page,e2e,api,index}` with `toMatchSchema`, `api/clients/auth.client`, `api/schemas/auth.schema`, smoke specs for UI and API, ESLint architecture gates, `.github/actions/setup-playwright`, `lint.yml`, `playwright-parallel.yml`, `AGENTS.md`, `readme.md`, `.env.example`, `.gitignore`, and (unless `--no-kit`) the agent kit.
