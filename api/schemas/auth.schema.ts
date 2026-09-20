import { z } from 'zod';

export const AddressSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  fullName: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof AddressSchema>;

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(['customer', 'admin']),
  addresses: z.array(AddressSchema),
});
export type User = z.infer<typeof UserSchema>;

/** Returned by both `POST auth/login` (200) and `POST auth/register` (201). */
export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
