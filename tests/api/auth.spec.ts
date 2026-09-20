import { test, expect } from '@/fixtures/index.fixtures';
import { env } from '@/utils/env';
import data from '@/data/api.json';

test.describe('Auth API', { tag: ['@api'] }, () => {
  test('should log in with valid credentials', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.auth.login(env.API_USER_EMAIL, env.API_USER_PASSWORD);
    expect(response.status()).toBe(200);
    const { token, user } = await response.data();
    expect(token.split('.')).toHaveLength(3);
    expect(user.email).toBe(env.API_USER_EMAIL);
    expect(user.role).toBe('customer');
  });

  test('should return the current user for a valid token', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.auth.me();
    expect(response.status()).toBe(200);
    const user = await response.data();
    expect(user.email).toBe(env.API_USER_EMAIL);
  });

  test('should reject a wrong password with 401', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.auth.login(env.API_USER_EMAIL, data.auth.wrongPassword);
    expect(response.status()).toBe(401);
    const { error } = await response.error();
    expect(error.code).toBe('INVALID_CREDENTIALS');
  });

  test('should reject a request without a token with 401', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.auth.me();
    expect(response.status()).toBe(401);
    const { error } = await response.error();
    expect(error.code).toBe('UNAUTHORIZED');
  });

  test('should reject a malformed token with 401', { tag: ['@regression'] }, async ({ apiWithToken }) => {
    const clients = await apiWithToken(data.auth.invalidToken);
    const response = await clients.auth.me();
    expect(response.status()).toBe(401);
    const { error } = await response.error();
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
