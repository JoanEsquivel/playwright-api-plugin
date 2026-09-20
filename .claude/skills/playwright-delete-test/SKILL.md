---
name: playwright-delete-test
description: Remove Playwright API tests, spec files, clients, schemas or fixtures safely, cleaning every orphaned reference (createClients, fixtures, data, coverage map, config) and verifying with grep, lint and a run. Use when asked to "delete", "remove", "drop" a test, spec, client, schema or endpoint coverage.
---

# Delete tests safely

Removal order is always: spec → client method / client → schema → fixture wiring → data → coverage map → verify. Never leave a client that is not in `createClients`, or wiring that points to a deleted file.

## 1. Scope the deletion

| Request | Delete | Then check |
|---|---|---|
| One test case | the `test()` block; the enclosing `describe` if now empty | unused imports/data keys in that spec; the row in `docs/api-coverage.md` |
| One spec file | `tests/api/<name>.spec.ts` | whether its clients, schemas and factory fixtures are used elsewhere |
| A client method | the method in `api/clients/<name>.client.ts` | specs and fixtures calling it; its schema if nothing else binds it |
| An API client | `api/clients/<name>.client.ts` and `api/schemas/<name>.schema.ts` | `ApiClients` interface, `createClients`, fixtures built on it, specs, data keys |
| A factory fixture (`createX` / `tempX`) | its entries in `ApiFixtures` and `base.extend` | specs using it; `data/api.json` defaults only it used |

## 2. Find every reference before deleting

```bash
grep -rn "<ClassName>\|<fixtureName>\|<methodName>\|<SchemaName>" api fixtures utils tests data docs --include='*.ts' --include='*.json' --include='*.md'
```

If a client or schema is still used by another spec or by a fixture (`AuthClient` is used by `tokenFor` and `registerUser`; `AdminProductsClient` by `createProduct`), delete only the requested spec and stop.

## 3. Delete and clean

API client full cleanup: `git rm` client + schema; remove from `ApiClients` and `createClients` in `fixtures/api.fixtures.ts`; remove `data/api.json` keys only that spec used; set the affected rows of `docs/api-coverage.md` back to `pending` (the endpoint still exists; only its coverage is gone); re-run the grep → zero results outside `docs/api-coverage.md`.

Schemas shared through `common.schema.ts` (`ErrorResponseSchema`, `pageOf`) and `api/typed-response.ts` are never deleted with a resource.

Config: if `tests/api` becomes empty, keep the project definition unless the user asks to remove the suite entirely.

## 4. Verify

```bash
pnpm lint
pnpm exec playwright test --list            # no missing-import errors
pnpm test                                   # the remaining suite still passes
```

## 5. Report

List removed files, edited files, and the grep/lint/run evidence.
