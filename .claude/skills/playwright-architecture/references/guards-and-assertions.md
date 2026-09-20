# Assertions and where they live

## The rule

Assertions express the outcome a test verifies. They live only in `tests/**`. Clients send requests and declare contracts; fixtures prepare state. Neither calls `expect` (lint fails for `api/**`).

## What is allowed outside specs

| What | Where | Shape | Purpose |
|---|---|---|---|
| Contract binding | `api/clients/*.client.ts` | `return typed(this.request.get(…), Schema)` | Declares which schema a successful answer of this endpoint follows. Validates nothing until a spec asks |
| Contract validation | `api/typed-response.ts` | `data()` / `error()` throw an `Error` with URL, status and the zod path | The one place where JSON goes from `unknown` to a type |
| Precondition failure | `fixtures/api.fixtures.ts` | `throw new Error('User registration failed: 409 …')` | A fixture could not prepare the state a test needs. Never `expect` |

Anything else that looks like an assertion outside specs is a violation.

## API assertion order

1. `expect(response.status()).toBe(<code>)` — the exact code observed on the live API, never `ok()`.
2. `const order = await response.data()` — validates the body against the endpoint's schema and returns it fully typed. For non-2xx answers: `const { error } = await response.error()`.
3. Business rules on the typed value: `expect(order.status).toBe('paid')`.

Never `response.json()` in a spec (it is `any`), never `const body: unknown`, never `as Order`, never a schema import in a spec. If a field is missing from the type, the schema is incomplete: fix the schema from a real response.

## Exact values over tolerances

Money and other rounded values are compared with `toBe` against the same rounding the API applies (`Math.round(value * 100 + 1e-7) / 100`), not with `toBeCloseTo`, which passes for a half-cent error.

## Soft assertions

Use `expect.soft()` when several independent facts of one response should all be reported in one run (the five fields of an order's totals). Keep hard `expect` for anything later steps depend on (status codes, ids).

## When a test fails

Never make it pass by loosening the assertion or the schema. Reproduce with `curl`, read the zod path in the error, fix the smallest thing. If the API behavior changed unexpectedly, write a bug report (`playwright-fix-test`).
