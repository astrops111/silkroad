import { z } from "zod/v4";

export const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  nameLocal: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryId: z.string().uuid("Please select a category"),
  basePrice: z.number().positive("Price must be greater than 0"),
  comparePrice: z.number().positive().optional(),
  currency: z.string().length(3).default("USD"),
  moq: z.number().int().positive("MOQ must be at least 1").default(1),
  leadTimeDays: z.number().int().positive().optional(),
  tradeTerm: z
    .enum(["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"])
    .default("fob"),
  sampleAvailable: z.boolean().default(false),
  samplePrice: z.number().positive().optional(),
  sampleMoq: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  hsCode: z.string().optional(),
  originCountry: z.string().length(2).optional(),
  cogs: z.number().positive().optional(),
  brand: z.string().optional(),
  janCode: z.string().optional(),
  shelfLifeDays: z.number().int().positive().optional(),
  boxPackQty: z.number().int().positive().optional(),
  shippingMode: z.enum(["air", "sea", "either"]).optional(),
  legalCategory: z.string().optional(),
  skinHairType: z.string().optional(),
  targetAudience: z.string().optional(),
  scent: z.string().optional(),
  texture: z.string().optional(),
  usageInstructions: z.string().optional(),
  storageInstructions: z.string().optional(),
  warnings: z.string().optional(),
});

export const pricingTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive().optional(),
  unitPrice: z.number().positive(),
  currency: z.string().length(3).default("USD"),
});

export const productVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional(),
  priceOverride: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  weightKg: z.number().positive().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type PricingTierInput = z.infer<typeof pricingTierSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
