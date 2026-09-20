import { z } from 'zod';
import { pageOf } from './common.schema';

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  stock: z.number().int().nonnegative(),
  imageEmoji: z.string().min(1),
  rating: z.number().min(0).max(5),
  createdAt: z.iso.datetime(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductPageSchema = pageOf(ProductSchema);
export type ProductPage = z.infer<typeof ProductPageSchema>;

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  tags?: string[];
  imageEmoji?: string;
}
