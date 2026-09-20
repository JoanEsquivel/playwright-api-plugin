import type { ApiRequest } from '@/api/api-log';
import { AuthResponseSchema, UserSchema, type RegisterInput } from '@/api/schemas/auth.schema';
import { typed } from '@/api/typed-response';

export class AuthClient {
  constructor(private readonly request: ApiRequest) {}

  async login(email: string, password: string) {
    return typed(this.request.post('auth/login', { data: { email, password } }), AuthResponseSchema);
  }

  async register(input: RegisterInput) {
    return typed(this.request.post('auth/register', { data: input }), AuthResponseSchema);
  }

  async me() {
    return typed(this.request.get('auth/me'), UserSchema);
  }
}
