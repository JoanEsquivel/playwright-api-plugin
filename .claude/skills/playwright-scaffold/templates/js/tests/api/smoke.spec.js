import { test, expect } from '../../fixtures/index.fixtures';

test.describe('API smoke', { tag: ['@api'] }, () => {
  test('should reach the API base URL', { tag: ['@smoke'] }, async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBeLessThan(500);
  });
});
