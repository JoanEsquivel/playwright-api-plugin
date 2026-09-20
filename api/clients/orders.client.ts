import type { ApiRequest } from '@/api/api-log';
import { OrderListSchema, OrderSchema, type CheckoutInput } from '@/api/schemas/order.schema';
import { typed } from '@/api/typed-response';

export class OrdersClient {
  constructor(private readonly request: ApiRequest) {}

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
