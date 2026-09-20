import { z } from 'zod';

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

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  tags?: string[];
  imageEmoji?: string;
}
