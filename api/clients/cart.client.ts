import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { AddCartItemInput } from '@/api/schemas/cart.schema';

export class CartClient {
  constructor(private readonly request: APIRequestContext) {}

  async get(): Promise<APIResponse> {
    return this.request.get('cart');
  }

  async addItem(input: AddCartItemInput): Promise<APIResponse> {
    return this.request.post('cart/items', { data: input });
  }
}
