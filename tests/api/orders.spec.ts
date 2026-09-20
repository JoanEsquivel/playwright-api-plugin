import { test, expect } from '@/fixtures/index.fixtures';
import { CartSchema } from '@/api/schemas/cart.schema';
import { ErrorResponseSchema } from '@/api/schemas/common.schema';
import { OrderSchema } from '@/api/schemas/order.schema';
import data from '@/data/api.json';

const QTY = 2;
/** Same rounding as the API: half-up to cents. */
const toCents = (value: number) => Math.round(value * 100 + 1e-7) / 100;
const checkoutWith = (payment: typeof data.cards.approved) => ({ shippingAddress: data.shippingAddress, payment });

// Every test runs as a freshly registered customer (newUserApi) and buys a product it created
// itself (tempProduct): no seeded account, cart or stock is touched, so the suite is safe in
// parallel and can run forever against a server that is never reset.
test.describe('Orders API', { tag: ['@api'] }, () => {
  test('should place a paid order from the cart', { tag: ['@smoke'] }, async ({ newUserApi, tempProduct }) => {
    const { clients, user } = newUserApi;

    const cartResponse = await test.step('add a product to the cart', async () => {
      return clients.cart.addItem({ productId: tempProduct.id, qty: QTY });
    });

    expect(cartResponse.status()).toBe(201);
    const cartBody: unknown = await cartResponse.json();
    expect(cartBody).toMatchSchema(CartSchema);
    const cart = CartSchema.parse(cartBody);

    const response = await test.step('check out with an approved card', async () => {
      return clients.orders.create(checkoutWith(data.cards.approved));
    });

    expect(response.status()).toBe(201);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(OrderSchema);

    const order = OrderSchema.parse(body);
    expect(order.status).toBe('paid');
    expect(order.userId).toBe(user.id);
    expect(order.orderNumber).toMatch(new RegExp(data.orders.numberPattern));
    expect(order.paymentMethod.last4).toBe(data.cards.approved.cardNumber.slice(-4));
    expect(order.items).toEqual(cart.items);

    const { subtotal, discount, shipping, tax, total } = order.totals;
    expect(order.items[0].unitPrice).toBe(tempProduct.price);
    expect(subtotal).toBe(toCents(tempProduct.price * QTY));
    expect(discount).toBe(0);
    expect(shipping).toBe(data.pricing.shippingFlat);
    expect(tax).toBe(toCents(subtotal * data.pricing.taxRate));
    expect(total).toBe(toCents(subtotal + shipping + tax));

    await test.step('checkout empties the cart', async () => {
      const after = await clients.cart.get();
      expect(after.status()).toBe(200);
      expect(CartSchema.parse(await after.json()).items).toEqual([]);
    });
  });

  test('should decline the test decline card with 400', { tag: ['@regression'] }, async ({ newUserApi, tempProduct }) => {
    const { clients } = newUserApi;
    const cartResponse = await clients.cart.addItem({ productId: tempProduct.id, qty: QTY });
    expect(cartResponse.status()).toBe(201);

    const response = await clients.orders.create(checkoutWith(data.cards.declined));
    expect(response.status()).toBe(400);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('PAYMENT_DECLINED');

    const orders = await clients.orders.list();
    expect(orders.status()).toBe(200);
    expect(await orders.json()).toEqual([]);
  });

  test('should reject checkout of an empty cart with 400', { tag: ['@regression'] }, async ({ newUserApi }) => {
    const response = await newUserApi.clients.orders.create(checkoutWith(data.cards.approved));
    expect(response.status()).toBe(400);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('EMPTY_CART');
  });

  test('should hide an order from other customers with 404', { tag: ['@regression'] }, async ({ newUserApi, registerUser, tempProduct }) => {
    const owner = newUserApi.clients;
    const cartResponse = await owner.cart.addItem({ productId: tempProduct.id, qty: 1 });
    expect(cartResponse.status()).toBe(201);
    const created = await owner.orders.create(checkoutWith(data.cards.approved));
    expect(created.status()).toBe(201);
    const { id } = OrderSchema.parse(await created.json());

    const stranger = await registerUser();
    const response = await stranger.clients.orders.getById(id);
    expect(response.status()).toBe(404);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('NOT_FOUND');

    const ownView = await owner.orders.getById(id);
    expect(ownView.status()).toBe(200);
  });
});
