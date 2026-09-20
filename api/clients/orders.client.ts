import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CheckoutInput } from '@/api/schemas/order.schema';

export class OrdersClient {
  constructor(private readonly request: APIRequestContext) {}

  async create(input: CheckoutInput): Promise<APIResponse> {
    return this.request.post('orders', { data: input });
  }

  async list(): Promise<APIResponse> {
    return this.request.get('orders');
  }

  async getById(id: string): Promise<APIResponse> {
    return this.request.get(`orders/${id}`);
  }
}
