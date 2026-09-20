import { z } from 'zod';

export const TotalsSchema = z.object({
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type Totals = z.infer<typeof TotalsSchema>;

export const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
  lineTotal: z.number().nonnegative(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string().min(1),
  items: z.array(CartItemSchema),
  couponCode: z.string().nullable(),
  totals: TotalsSchema,
});
export type Cart = z.infer<typeof CartSchema>;

export interface AddCartItemInput {
  productId: string;
  qty: number;
}
