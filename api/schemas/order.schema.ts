import { z } from 'zod';
import { AddressSchema } from './auth.schema';
import { CartItemSchema, TotalsSchema } from './cart.schema';

export const OrderSchema = z.object({
  id: z.string().min(1),
  orderNumber: z.string().min(1),
  userId: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  shippingAddress: AddressSchema.omit({ id: true }),
  paymentMethod: z.object({ type: z.literal('card'), last4: z.string().length(4) }),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
  totals: TotalsSchema,
  createdAt: z.iso.datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListSchema = z.array(OrderSchema);

export interface AddressInput {
  label: string;
  fullName: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentInput {
  cardNumber: string;
  expiry: string;
  cvc: string;
  cardHolder: string;
}

export interface CheckoutInput {
  shippingAddress: AddressInput;
  payment: PaymentInput;
}
