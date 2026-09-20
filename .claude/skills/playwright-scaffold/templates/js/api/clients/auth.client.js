// @ts-check

/** SCAFFOLD: adjust the login endpoint and payload to the real API. Returns raw responses. */
export class AuthClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    return this.request.post('/auth/login', { data: { username, password } });
  }
}
