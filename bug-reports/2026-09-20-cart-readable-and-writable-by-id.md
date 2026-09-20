### BUG-1 — A registered user's cart can be read and modified by anyone who knows its id

**Summary:** Cart endpoints accept an `X-Cart-Id` header for guest carts, but they do not check that the cart is a guest cart: with no token at all, the id of a registered user's cart is enough to read it and change it.

**Environment:** `http://localhost:8000/api/` (The Test Automation Website backend, local), role anonymous, API version 1.0.0, date 2026-09-20

**Steps to reproduce:**
1. Register a user (`POST auth/register`) and add any product to their cart with their Bearer token (`POST cart/items`). Note the cart `id` in the response, for example `cart-554c4d5e`.
2. Without any `Authorization` header: `curl -s http://localhost:8000/api/cart -H 'X-Cart-Id: cart-554c4d5e'`.
3. Without any `Authorization` header: `curl -s -X PATCH http://localhost:8000/api/cart/items/<productId> -H 'Content-Type: application/json' -H 'X-Cart-Id: cart-554c4d5e' -d '{"qty":3}'`.
4. Read the cart again as the owner, with their token (`GET cart`).

**Expected result:** Steps 2 and 3 answer `401 UNAUTHORIZED` (or `404 NOT_FOUND`): a cart owned by a user is reachable only with that user's token. `X-Cart-Id` should resolve guest carts only.

**Actual result:** Step 2 answers `200` with the owner's full cart (items, coupon, totals). Step 3 answers `200` and changes the quantity. Step 4 shows `qty: 3`: the owner sees the change made by the anonymous caller.

**Evidence:** the three `curl` commands above. In the backend, the cart identity resolver accepts any known cart id from the header and never compares the cart's owner with the caller.

**Severity:** medium — broken access control (read and write). Cart ids are random 8-hex strings, which limits guessing, but they are returned in every cart response and the API has no rate limit. No payment or address data is exposed through the cart.

**Automated test:** none yet. A regression test belongs in `tests/api/cart.spec.ts` once a guest-cart fixture (an `X-Cart-Id` context) exists: create a cart as `newUserApi`, call `cart.get()` from a guest context carrying that id, expect `401`.
