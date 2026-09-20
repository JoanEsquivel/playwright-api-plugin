---
name: playwright-delete-test
description: Remove Playwright tests, spec files, page objects, API clients, schemas or fixtures safely, cleaning every orphaned reference (fixtures, flows, data, config) and verifying with grep, lint and a run. Use when asked to "delete", "remove", "drop" a test, spec, page object, client or endpoint coverage.
---

# Delete tests safely

Removal order is always: spec → page object / client → fixture entry → flow methods → data → verify. Never leave a class without a fixture entry or a fixture pointing to a deleted file.

## 1. Scope the deletion

| Request | Delete | Then check |
|---|---|---|
| One test case | the `test()` block; the enclosing `describe` if now empty | unused imports/data keys in that spec |
| One spec file | `tests/<dir>/<name>.spec.*` | whether its page objects/clients are used elsewhere |
| A page object | `pages/<name>.*` | fixture entry, `PageFixtures` interface, `utils/e2e` property and flow methods, specs |
| An API client | `api/clients/<name>.client.*` and `api/schemas/<name>.schema.*` | `ApiClients` interface, `createClients`, specs, data keys |
| A flow method | method in `utils/e2e.*` | specs calling it |

## 2. Find every reference before deleting

```bash
grep -rn "<ClassName>\|<fixtureName>\|<methodName>" pages utils fixtures api tests data --include=*.ts --include=*.js
```

If a page object/client is still used by another spec, delete only the requested spec and stop.

## 3. Delete and clean

Page object full cleanup:
1. `git rm pages/<name>.*`
2. `fixtures/page.fixtures.*`: remove import, interface entry, `extend` entry
3. `utils/e2e.*`: remove import, property, methods that used it
4. `data/<name>.json`: remove if only that spec used it
5. Re-run the grep from step 2 → zero results

API client full cleanup: `git rm` client + schema; remove from `ApiClients` and `createClients` in `fixtures/api.fixtures.*`; remove `data/api.json` keys only that spec used; re-grep.

Config: if a whole project directory becomes empty (`tests/api` with no specs), keep the project definition unless the user asks to remove the API layer entirely (then also drop `API_*` vars from `.env.example`/`AGENTS.md`).

## 4. Verify

```bash
pnpm lint
pnpm exec playwright test --list            # no missing-import errors
pnpm exec playwright test --project=<affected>   # the remaining suite still passes
```

## 5. Report

List removed files, edited files, and the grep/lint/run evidence.
