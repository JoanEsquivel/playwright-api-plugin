# API flow — from real response to spec

## A. Probe

`API_BASE_URL` ends with `/`, so paths are appended without a leading slash.

```bash
set -a; source .env; set +a
curl -s "${API_BASE_URL%/api/}/openapi.json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const [p,m] of Object.entries(JSON.parse(s).paths))for(const [k,d] of Object.entries(m))console.log(k.toUpperCase(),p,d.security?'AUTH':'')})"   # map, if the API publishes one
curl -s -i "${API_BASE_URL}<path>" | head -40                       # status + headers + body start
curl -s "${API_BASE_URL}<path>" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(Array.isArray(j)?j[0]:j,null,2).slice(0,3000))})"
```

Authenticated endpoints: obtain a token with the app's login call, then pass it as a Bearer header. Read the login payload and the token field name from `api/clients/auth.client.ts` and `AuthResponseSchema`; in this repository:

```bash
TOKEN=$(curl -s -X POST "${API_BASE_URL}auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"'"$API_USER_EMAIL"'","password":"'"$API_USER_PASSWORD"'"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))")
curl -s -i "${API_BASE_URL}<path>" -H "Authorization: Bearer $TOKEN"
```

Probe the auth matrix and the negative cases too, and note the exact status codes and error shape: no token (401), wrong role (403), someone else's resource, unknown id (404), bad payload (400). The OpenAPI document may disagree with the server (for example documenting 422 where the API answers 400); the server wins, and the mismatch goes in `docs/api-coverage.md`.

Probing with a real account mutates it. Register a throwaway user for probes that write.

## B. Schema (`api/schemas/<resource>.schema.ts`)

- One `z.object` per payload shape; strings `.min(1)` when never empty, `z.email()`, `z.url()`, `z.iso.datetime()`, `z.enum([...])` where the sample and the contract show those formats.
- `.optional()` / `.nullable()` only for fields absent or null in at least one real sample.
- Export `XSchema`, `type X = z.infer<typeof XSchema>` and the request input interfaces. Reuse `ErrorResponseSchema` and `pageOf(XSchema)` from `common.schema.ts`.

## C. Client (`api/clients/<resource>.client.ts`)

- Class `<Resource>Client` with `constructor(private readonly request: APIRequestContext)`.
- One method per endpoint, typed params, path **without a leading slash**, returns `Promise<APIResponse>`. No parsing, no assertions.

## D. Fixture wiring (`fixtures/api.fixtures.ts`)

Add the client to `ApiClients` and to `createClients`. Every fixture (`api`, `authedApi`, `adminApi`, `newUserApi`, `apiWithToken`) picks it up. If tests for the new resource need a throwaway global record, add a factory fixture next to `createProduct` that records ids and deletes them after `use`.

## E. Spec (`tests/api/<resource>.spec.ts`)

Choose the fixture by what the test does to the server:

| The test… | Fixture |
|---|---|
| calls a public endpoint, or checks a 401 | `api` |
| only reads as a seeded account, or checks a 403 | `authedApi` / `adminApi` |
| mutates per-user state | `newUserApi` (second actor: `registerUser()`) |
| consumes or mutates global state (stock, ratings, catalog) | `tempProduct`, or `createProduct(input)` when the create response is what you assert |
| sends a crafted or invalid token | `apiWithToken(token)` |

```ts
import { test, expect } from '@/fixtures/index.fixtures';
import { ErrorResponseSchema, pageOf } from '@/api/schemas/common.schema';
import { <Resource>Schema } from '@/api/schemas/<resource>.schema';
import data from '@/data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should list <resources>', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.<resource>.list({ pageSize: 5 });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    const PageSchema = pageOf(<Resource>Schema);
    expect(body).toMatchSchema(PageSchema);
    expect(PageSchema.parse(body).items.length).toBeLessThanOrEqual(5);
  });

  test('should return 404 for an unknown id', { tag: ['@regression'] }, async ({ authedApi }) => {
    const response = await authedApi.<resource>.getById(data.<resources>.missingId);
    expect(response.status()).toBe(404);
    const errorBody: unknown = await response.json();
    expect(errorBody).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(errorBody).error.code).toBe('NOT_FOUND');
  });
});
```

Put ids, search terms and invalid inputs in `data/api.json`. Use the status codes observed in the probe; never `ok()` as a substitute for a specific code. Never assert absolute shared state (list totals, counters, stock).

## F. Run

```bash
pnpm lint
pnpm exec playwright test tests/api/<resource>.spec.ts --project=api
pnpm exec playwright test tests/api/<resource>.spec.ts --repeat-each 5 --workers 4   # isolation check
```

Then add the endpoint rows to `docs/api-coverage.md`.

Schema failures print the zod path (`items[0].brand: expected string, received undefined`) → check the sample again before loosening the schema; loosen only with evidence from a real payload.
