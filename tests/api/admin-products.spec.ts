import { test, expect } from '@/fixtures/index.fixtures';
import data from '@/data/api.json';

test.describe('Admin products API', { tag: ['@api'] }, () => {
  test('should reject an anonymous request with 401', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.adminProducts.list();
    expect(response.status()).toBe(401);
    const { error } = await response.error();
    expect(error.code).toBe('UNAUTHORIZED');
  });

  test('should forbid a customer token with 403', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.adminProducts.list();
    expect(response.status()).toBe(403);
    const { error } = await response.error();
    expect(error.code).toBe('FORBIDDEN');
  });

  test('should list products for an admin', { tag: ['@regression'] }, async ({ adminApi }) => {
    const pageSize = 5;
    const response = await adminApi.adminProducts.list({ page: 1, pageSize });
    expect(response.status()).toBe(200);
    const page = await response.data();
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(pageSize);
    expect(page.items.length).toBeLessThanOrEqual(pageSize);
  });

  // createProduct records the id as soon as the API answers 201 and deletes the product after the
  // test, so a failed assertion cannot leave it behind in the global catalog.
  test('should create a product and delete it', { tag: ['@regression'] }, async ({ createProduct, adminApi, api }) => {
    const response = await createProduct(data.newProduct);
    expect(response.status()).toBe(201);
    const product = await response.data();
    const { name, ...expected } = data.newProduct;
    expect(product).toMatchObject(expected);
    expect(product.name).toContain(name);
    expect(product.rating).toBe(0);

    const published = await api.products.getById(product.id);
    expect(published.status()).toBe(200);
    expect((await published.data()).id).toBe(product.id);

    const deleted = await adminApi.adminProducts.delete(product.id);
    expect(deleted.status()).toBe(204);

    const gone = await api.products.getById(product.id);
    expect(gone.status()).toBe(404);
    expect((await gone.error()).error.code).toBe('NOT_FOUND');
  });
});
