/**
 * Central access to environment variables. Getters are lazy so API-only runs
 * do not require UI variables and vice versa. Copy `.env.example` to `.env`.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  get BASE_URL(): string { return requireEnv('BASE_URL'); },
  get E2E_USERNAME(): string { return requireEnv('E2E_USERNAME'); },
  get E2E_PASSWORD(): string { return requireEnv('E2E_PASSWORD'); },
  // @api-start
  get API_BASE_URL(): string { return requireEnv('API_BASE_URL'); },
  get API_USERNAME(): string { return requireEnv('API_USERNAME'); },
  get API_PASSWORD(): string { return requireEnv('API_PASSWORD'); },
  // @api-end
};
