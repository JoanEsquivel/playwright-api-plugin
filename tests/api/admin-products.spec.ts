import { test, expect } from '@/fixtures/index.fixtures';
import { ErrorResponseSchema, pageOf } from '@/api/schemas/common.schema';
import { ProductSchema } from '@/api/schemas/product.schema';
import data from '@/data/api.json';

test.describe('Admin products API', { tag: ['@api'] }, () => {
  test('should reject an anonymous request with 401', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.adminProducts.list();
    expect(response.status()).toBe(401);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('UNAUTHORIZED');
  });

  test('should forbid a customer token with 403', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.adminProducts.list();
    expect(response.status()).toBe(403);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ErrorResponseSchema);
    expect(ErrorResponseSchema.parse(body).error.code).toBe('FORBIDDEN');
  });

  test('should list products for an admin', { tag: ['@regression'] }, async ({ adminApi }) => {
    const pageSize = 5;
    const response = await adminApi.adminProducts.list({ page: 1, pageSize });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    const ProductPageSchema = pageOf(ProductSchema);
    expect(body).toMatchSchema(ProductPageSchema);
    const page = ProductPageSchema.parse(body);
    expect(page.pageSize).toBe(pageSize);
    expect(page.items.length).toBeLessThanOrEqual(pageSize);
  });

  // createProduct tracks the id before any assertion runs and deletes the product after the
  // test, so a failed assertion cannot leave it behind in the global catalog.
  test('should create a product and delete it', { tag: ['@regression'] }, async ({ createProduct, adminApi, api }) => {
    const response = await createProduct(data.newProduct);
    expect(response.status()).toBe(201);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductSchema);
    const product = ProductSchema.parse(body);
    const { name, ...expected } = data.newProduct;
    expect(product).toMatchObject(expected);
    expect(product.name).toContain(name);
    expect(product.rating).toBe(0);

    const published = await api.products.getById(product.id);
    expect(published.status()).toBe(200);

    const deleted = await adminApi.adminProducts.delete(product.id);
    expect(deleted.status()).toBe(204);

    const gone = await api.products.getById(product.id);
    expect(gone.status()).toBe(404);
  });
});
