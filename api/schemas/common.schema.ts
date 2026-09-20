import { z } from 'zod';

/** Every non-2xx response uses this envelope: `{ error: { code, message } }`. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/** Pagination envelope shared by every paginated list: `pageOf(ProductSchema)`. */
export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
  });
