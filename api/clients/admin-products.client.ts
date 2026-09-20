import type { APIRequestContext, APIResponse } from '@playwright/test';
import { ProductPageSchema, ProductSchema, type CreateProductInput } from '@/api/schemas/product.schema';
import { typed } from '@/api/typed-response';

export interface AdminProductsListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export class AdminProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: AdminProductsListParams = {}) {
    return typed(this.request.get('admin/products', { params: { ...params } }), ProductPageSchema);
  }

  async create(input: CreateProductInput) {
    return typed(this.request.post('admin/products', { data: input }), ProductSchema);
  }

  /** 204, no body: nothing to type. */
  async delete(id: string): Promise<APIResponse> {
    return this.request.delete(`admin/products/${id}`);
  }
}
