import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async getById(id: string): Promise<APIResponse> {
    return this.request.get(`products/${id}`);
  }
}
