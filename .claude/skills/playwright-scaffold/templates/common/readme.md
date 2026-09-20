# {{PROJECT_NAME}}

Playwright test framework generated with the Playwright standards kit. Conventions live in `AGENTS.md`; agent skills in `.claude/skills/`.

```bash
cp .env.example .env
{{PM}} install
{{PM_EXEC}} playwright install chromium --with-deps
{{PM_RUN}} lint
{{PM_RUN}} test
```

| Script | Runs |
|---|---|
| `test` | every project |
| `test:ui` / `test:e2e` | UI / end-to-end specs |
# @api-start
| `test:api` | API specs |
# @api-end
| `test:smoke` | tests tagged `@smoke` |
| `test:debug <spec>` | pause and attach with `playwright-cli attach <session>` |
| `lint` | ESLint + typecheck |
