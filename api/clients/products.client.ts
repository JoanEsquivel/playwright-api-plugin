import type { ApiRequest } from '@/api/api-log';
import { ProductSchema } from '@/api/schemas/product.schema';
import { typed } from '@/api/typed-response';

export class ProductsClient {
  constructor(private readonly request: ApiRequest) {}

  async getById(id: string) {
    return typed(this.request.get(`products/${id}`), ProductSchema);
  }
}
