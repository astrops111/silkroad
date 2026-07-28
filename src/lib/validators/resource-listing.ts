import { z } from "zod/v4";

export const resourceListingSchema = z.object({
  nameEn: z.string().min(3, "Listing name must be at least 3 characters"),
  nameZh: z.string().optional(),
  nameFr: z.string().optional(),
  resourceCategoryId: z.string().uuid("Please select a category"),
  originCountry: z.string().length(2, "Use a 2-letter country code"),
  originRegion: z.string().optional(),
  grade: z.string().optional(),
  variety: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  incoterm: z.enum(["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"]).optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  availableQuantity: z.number().positive("Available quantity must be greater than 0"),
  minOrderQuantity: z.number().positive().optional(),
  pricePerUnitUsd: z.number().positive("Price must be greater than 0"),
  currency: z.string().length(3).default("USD"),
  leadTimeDays: z.number().int().positive().optional(),
  images: z.array(z.string()).max(20).optional(),
  // Compliance reference numbers — only enforced (by the DB trigger) once an
  // admin approves the listing, but suppliers can attach them up front.
  kimberleyCertRef: z.string().optional(),
  oecd3tgDueDiligenceRef: z.string().optional(),
  citesPermitRef: z.string().optional(),
  gaccRegistrationRef: z.string().optional(),
  mineLicenseRef: z.string().optional(),
  exportPermitRef: z.string().optional(),
});

export type ResourceListingInput = z.infer<typeof resourceListingSchema>;
