# API coverage map

Source: `GET /openapi.json` of the example API (38 operations, one `HTTPBearer` scheme), cross-checked with `curl` against the running server. Update this file whenever a spec is added or removed.

Auth column: **–** public · **B** any Bearer token · **B-admin** Bearer token with the admin role · **cart** Bearer token or `X-Cart-Id` guest header.

## Where the OpenAPI document and the server disagree

| OpenAPI says | The server does | Consequence |
|---|---|---|
| Validation errors are `422` with FastAPI's `HTTPValidationError` | `400` with `{ error: { code: "VALIDATION_ERROR", message } }` | Assert `400` + `ErrorResponseSchema`. Never generate expectations from the document alone. |
| Error responses (`401`, `403`, `404`, `409`) are not documented at all | One envelope for every non-2xx: `{ error: { code, message } }` | `ErrorResponseSchema` in `common.schema.ts` covers all of them. |
| Cart operations require `HTTPBearer` | `POST cart` needs no identity at all, and the other cart operations also accept an `X-Cart-Id` header whose value came from `POST cart` (an arbitrary id answers 401) | A guest-cart client needs a header fixture, not a token. Pending. |
| `POST /auth/logout` returns `204` | It does, but the token stays valid until it expires (stateless JWT, 24 h) | Do not write a "401 after logout" test. |

## Operations

| Method | Path | Auth | Covered by |
|---|---|---|---|
| GET | `health` | – | used as `API_SERVER_READY_URL` |
| POST | `auth/login` | – | `auth.spec.ts` (200, 401 wrong password) · every `tokenFor` login |
| POST | `auth/register` | – | exercised by `registerUser()` in every `orders.spec.ts` test · dedicated spec pending (400, 409) |
| GET | `auth/me` | B | `auth.spec.ts` (200, 401 no token, 401 malformed token) |
| PUT | `auth/me` | B | pending |
| POST | `auth/logout` | B | pending |
| POST | `auth/me/addresses` | B | pending |
| PUT | `auth/me/addresses/{id}` | B | pending |
| DELETE | `auth/me/addresses/{id}` | B | pending |
| GET | `products` | – | pending |
| GET | `products/{id}` | – | `admin-products.spec.ts` (200 after create, 404 after delete) |
| GET | `categories` | – | pending |
| GET | `products/{id}/reviews` | – | pending |
| POST | `products/{id}/reviews` | B | pending (mutates a global rating: use a product the test created) |
| POST | `cart` | – | pending |
| GET | `cart` | cart | `orders.spec.ts` (empty after checkout) |
| POST | `cart/items` | cart | `orders.spec.ts` (201 + `CartSchema`, on a `tempProduct`) |
| PATCH | `cart/items/{productId}` | cart | pending |
| DELETE | `cart/items/{productId}` | cart | pending (answers 200 + cart, not 204) |
| POST | `cart/coupon` | cart | pending |
| DELETE | `cart/coupon` | cart | pending |
| POST | `coupons/validate` | – | pending |
| POST | `orders` | B | `orders.spec.ts` (201 paid + totals, 400 `PAYMENT_DECLINED`, 400 `EMPTY_CART`) |
| GET | `orders` | B | `orders.spec.ts` (empty after a declined payment) |
| GET | `orders/{id}` | B | `orders.spec.ts` (200 owner, 404 other customer) |
| GET | `wishlist` | B | pending |
| POST | `wishlist/{productId}` | B | pending |
| DELETE | `wishlist/{productId}` | B | pending |
| GET | `files/products.csv` | – | pending |
| GET | `files/sample-report.pdf` | – | pending |
| POST | `files/upload` | – | pending |
| GET | `admin/products` | B-admin | `admin-products.spec.ts` (401, 403, 200 + `pageOf(ProductSchema)`) |
| POST | `admin/products` | B-admin | `admin-products.spec.ts` (201 + `ProductSchema`) · every `createProduct` / `tempProduct` |
| PUT | `admin/products/{id}` | B-admin | pending |
| DELETE | `admin/products/{id}` | B-admin | `admin-products.spec.ts` (204) · teardown of `createProduct` |
| GET | `admin/orders` | B-admin | pending |
| PATCH | `admin/orders/{id}/status` | B-admin | pending (create the order with `newUserApi` first) |
| GET | `admin/stats` | B-admin | pending (global aggregates: assert shape and deltas, never absolute values) |

Covered: 12 of 38 operations.

## Shared state to respect when adding coverage

The example API keeps everything in one in-memory store and has no reset endpoint.

- **Stock** decreases on every checkout and never comes back. Check out a `tempProduct`, never a seeded product: even a stock of 500 runs out.
- **Order numbers** are a global sequence. Match `data.orders.numberPattern`, never a literal.
- **Ratings** are recomputed from all reviews of a product. Review a `tempProduct`.
- **Catalog** changes are visible to every test. `createProduct` / `tempProduct` give the product a unique name and delete it after the test; never edit seeded ones.
- **Seeded accounts** accumulate state across runs. Read-only, always.
