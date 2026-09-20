import type { APIRequestContext } from '@playwright/test';
import { OrderListSchema, OrderSchema, type CheckoutInput } from '@/api/schemas/order.schema';
import { typed } from '@/api/typed-response';

export class OrdersClient {
  constructor(private readonly request: APIRequestContext) {}

  async create(input: CheckoutInput) {
    return typed(this.request.post('orders', { data: input }), OrderSchema);
  }

  async list() {
    return typed(this.request.get('orders'), OrderListSchema);
  }

  async getById(id: string) {
    return typed(this.request.get(`orders/${id}`), OrderSchema);
  }
}
