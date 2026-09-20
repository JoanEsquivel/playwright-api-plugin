import type { APIRequestContext, APIResponse } from '@playwright/test';

/** SCAFFOLD: adjust the login endpoint and payload to the real API. Returns raw responses. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/auth/login', { data: { username, password } });
  }
}
