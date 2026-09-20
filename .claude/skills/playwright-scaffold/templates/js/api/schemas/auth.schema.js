import { z } from 'zod';

/** SCAFFOLD: derive from a real login response (`curl -s -X POST $API_BASE_URL/auth/login …`). */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export const ErrorResponseSchema = z.object({ message: z.string() });
