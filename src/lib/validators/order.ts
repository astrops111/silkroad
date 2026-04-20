import { z } from "zod/v4";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  supplierId: z.string().min(1),
  name: z.string().min(1).optional(),
  productName: z.string().min(1).optional(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  currency: z.string().length(3).optional(),
  image: z.string().optional(),
  moq: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart must have at least one item"),
  buyerCompanyId: z.string().optional(),
  buyerTaxId: z.string().optional(),
  buyerCompanyName: z.string().optional(),
  shippingAddresses: z.record(z.string(), z.unknown()).optional(),
  paymentGateway: z.string().optional(),
  phoneNumber: z.string().optional(),
  currency: z.string().length(3).default("USD"),
  note: z.string().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
