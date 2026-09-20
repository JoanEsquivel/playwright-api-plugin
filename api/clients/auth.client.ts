import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { RegisterInput } from '@/api/schemas/auth.schema';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(email: string, password: string): Promise<APIResponse> {
    return this.request.post('auth/login', { data: { email, password } });
  }

  async register(input: RegisterInput): Promise<APIResponse> {
    return this.request.post('auth/register', { data: input });
  }

  async me(): Promise<APIResponse> {
    return this.request.get('auth/me');
  }
}
