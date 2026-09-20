import type { APIRequestContext } from '@playwright/test';
import { ProductSchema } from '@/api/schemas/product.schema';
import { typed } from '@/api/typed-response';

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async getById(id: string) {
    return typed(this.request.get(`products/${id}`), ProductSchema);
  }
}
