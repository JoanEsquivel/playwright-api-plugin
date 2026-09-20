import type { ApiRequest } from '@/api/api-log';
import { CartSchema, type AddCartItemInput } from '@/api/schemas/cart.schema';
import { typed } from '@/api/typed-response';

export class CartClient {
  constructor(private readonly request: ApiRequest) {}

  async get() {
    return typed(this.request.get('cart'), CartSchema);
  }

  async addItem(input: AddCartItemInput) {
    return typed(this.request.post('cart/items', { data: input }), CartSchema);
  }
}
