import { z } from 'zod';

export const ProductSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1),
	price: z.number().nonnegative(),
	description: z.string(),
	category: z.string(),
	image: z.url(),
	rating: z.object({
		rate: z.number().min(0).max(5),
		count: z.number().int().nonnegative(),
	}),
});

export const ProductsSchema = z.array(ProductSchema);

export type Product = z.infer<typeof ProductSchema>;
