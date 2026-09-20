/**
 * Central access to environment variables. Getters are lazy so a run only
 * requires the variables it actually uses. Copy `.env.example` to `.env`.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  /**
   * Always ends with `/` so a path prefix (`/api`, `/api/v2`) survives URL resolution.
   * Clients therefore use paths without a leading slash: `'auth/login'`.
   */
  get API_BASE_URL(): string { return requireEnv('API_BASE_URL').replace(/\/*$/, '/'); },
  get API_USER_EMAIL(): string { return requireEnv('API_USER_EMAIL'); },
  get API_USER_PASSWORD(): string { return requireEnv('API_USER_PASSWORD'); },
  get API_ADMIN_EMAIL(): string { return requireEnv('API_ADMIN_EMAIL'); },
  get API_ADMIN_PASSWORD(): string { return requireEnv('API_ADMIN_PASSWORD'); },

  /** Optional: when set, Playwright starts the API under test itself (`webServer`). */
  get API_SERVER_COMMAND(): string | undefined { return optionalEnv('API_SERVER_COMMAND'); },
  get API_SERVER_CWD(): string | undefined { return optionalEnv('API_SERVER_CWD'); },
  get API_SERVER_READY_URL(): string | undefined { return optionalEnv('API_SERVER_READY_URL'); },
};
