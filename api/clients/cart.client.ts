import type { APIRequestContext } from '@playwright/test';
import { CartSchema, type AddCartItemInput } from '@/api/schemas/cart.schema';
import { typed } from '@/api/typed-response';

export class CartClient {
  constructor(private readonly request: APIRequestContext) {}

  async get() {
    return typed(this.request.get('cart'), CartSchema);
  }

  async addItem(input: AddCartItemInput) {
    return typed(this.request.post('cart/items', { data: input }), CartSchema);
  }
}
