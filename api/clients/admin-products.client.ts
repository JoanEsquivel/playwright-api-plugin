import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CreateProductInput } from '@/api/schemas/product.schema';

export interface AdminProductsListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export class AdminProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: AdminProductsListParams = {}): Promise<APIResponse> {
    return this.request.get('admin/products', { params: { ...params } });
  }

  async create(input: CreateProductInput): Promise<APIResponse> {
    return this.request.post('admin/products', { data: input });
  }

  async delete(id: string): Promise<APIResponse> {
    return this.request.delete(`admin/products/${id}`);
  }
}
