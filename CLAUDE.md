@AGENTS.md

## Claude Code

- The QA agent is `qa-playwright-engineer` (`.claude/agents/qa-playwright-engineer.md`); it preloads `playwright-architecture` and keeps project memory in `.claude/agent-memory/qa-playwright-engineer/`.
- After every `Edit`/`Write` under `tests/`, `api/`, `fixtures/`, `utils/`, a `PostToolUse` hook runs `scripts/lint-changed.sh` (ESLint `--fix` on that file). The hook is advisory; `pnpm lint` and the `Lint` workflow are the blocking gates.
- Use plan mode before changing `playwright.config.ts`, `eslint.config.mjs` or anything under `.github/`.
- Rules for specific paths load automatically from `.claude/rules/` when you touch matching files; `.cursor/rules` and `.github/instructions` are generated from them with `pnpm sync:agents`, never edited by hand.
