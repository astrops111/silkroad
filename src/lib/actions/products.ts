"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { productSchema, type ProductInput } from "@/lib/validators/product";
import type { TradeTerm } from "@/lib/supabase/database.types";
import { canSupply } from "@/lib/company-access";

// Listed price = COGS × this markup. COGS is supplier-internal; buyers see base_price only.
const COGS_MARKUP = 1.4;

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const SUPPLIER_WRITE_ROLES = [
  "supplier_owner",
  "supplier_catalog",
  "supplier_sales",
];

async function getSupplierCompanyId(): Promise<
  { ok: true; companyId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];
  if (!membership) return { ok: false, error: "Not signed in" };
  if (!canSupply(membership.companies?.type)) {
    return { ok: false, error: "Only supplier accounts can manage products" };
  }
  if (!SUPPLIER_WRITE_ROLES.includes(membership.role)) {
    return { ok: false, error: "Your role cannot manage products" };
  }
  return { ok: true, companyId: membership.company_id };
}

async function assertOwnsProduct(productId: string) {
  const gate = await getSupplierCompanyId();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("id", productId)
    .single();
  if (!data) return { ok: false as const, error: "Product not found" };
  if (data.supplier_id !== gate.companyId) {
    return { ok: false as const, error: "Not your product" };
  }
  return { ok: true as const, companyId: gate.companyId };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<{ id: string }>> {
  const gate = await getSupplierCompanyId();
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);

  const listedPrice =
    parsed.data.cogs != null ? parsed.data.cogs * COGS_MARKUP : parsed.data.basePrice;

  const { data, error } = await supabase
    .from("products")
    .insert({
      supplier_id: gate.companyId,
      name: parsed.data.name,
      name_local: parsed.data.nameLocal ?? null,
      slug,
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      base_price: Math.round(listedPrice * 100), // Convert to cents; derived from COGS × 1.4 when provided
      compare_price: parsed.data.comparePrice
        ? Math.round(parsed.data.comparePrice * 100)
        : null,
      currency: parsed.data.currency,
      moq: parsed.data.moq,
      lead_time_days: parsed.data.leadTimeDays ?? null,
      trade_term: parsed.data.tradeTerm as TradeTerm,
      sample_available: parsed.data.sampleAvailable,
      sample_price: parsed.data.samplePrice
        ? Math.round(parsed.data.samplePrice * 100)
        : null,
      sample_moq: parsed.data.sampleMoq ?? 1,
      weight_kg: parsed.data.weightKg ?? null,
      hs_code: parsed.data.hsCode ?? null,
      origin_country: parsed.data.originCountry ?? null,
      cogs: parsed.data.cogs ? Math.round(parsed.data.cogs * 100) : null,
      brand: parsed.data.brand ?? null,
      jan_code: parsed.data.janCode ?? null,
      shelf_life_days: parsed.data.shelfLifeDays ?? null,
      box_pack_qty: parsed.data.boxPackQty ?? null,
      shipping_mode: parsed.data.shippingMode ?? null,
      legal_category: parsed.data.legalCategory ?? null,
      skin_hair_type: parsed.data.skinHairType ?? null,
      target_audience: parsed.data.targetAudience ?? null,
      scent: parsed.data.scent ?? null,
      texture: parsed.data.texture ?? null,
      usage_instructions: parsed.data.usageInstructions ?? null,
      storage_instructions: parsed.data.storageInstructions ?? null,
      warnings: parsed.data.warnings ?? null,
      moderation_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/products");
  return { success: true, data: { id: data.id } };
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.nameLocal !== undefined) updateData.name_local = input.nameLocal;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  // base_price is derived from COGS × 1.4 when cogs is provided; otherwise manual basePrice applies.
  if (input.cogs !== undefined && input.cogs) {
    updateData.base_price = Math.round(input.cogs * COGS_MARKUP * 100);
  } else if (input.basePrice !== undefined) {
    updateData.base_price = Math.round(input.basePrice * 100);
  }
  if (input.comparePrice !== undefined)
    updateData.compare_price = input.comparePrice
      ? Math.round(input.comparePrice * 100)
      : null;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.moq !== undefined) updateData.moq = input.moq;
  if (input.leadTimeDays !== undefined)
    updateData.lead_time_days = input.leadTimeDays;
  if (input.tradeTerm !== undefined) updateData.trade_term = input.tradeTerm;
  if (input.sampleAvailable !== undefined)
    updateData.sample_available = input.sampleAvailable;
  if (input.weightKg !== undefined) updateData.weight_kg = input.weightKg;
  if (input.hsCode !== undefined) updateData.hs_code = input.hsCode;
  if (input.originCountry !== undefined)
    updateData.origin_country = input.originCountry;
  if (input.cogs !== undefined)
    updateData.cogs = input.cogs ? Math.round(input.cogs * 100) : null;
  if (input.brand !== undefined) updateData.brand = input.brand || null;
  if (input.janCode !== undefined) updateData.jan_code = input.janCode || null;
  if (input.shelfLifeDays !== undefined)
    updateData.shelf_life_days = input.shelfLifeDays ?? null;
  if (input.boxPackQty !== undefined)
    updateData.box_pack_qty = input.boxPackQty ?? null;
  if (input.shippingMode !== undefined)
    updateData.shipping_mode = input.shippingMode ?? null;
  if (input.legalCategory !== undefined)
    updateData.legal_category = input.legalCategory || null;
  if (input.skinHairType !== undefined)
    updateData.skin_hair_type = input.skinHairType || null;
  if (input.targetAudience !== undefined)
    updateData.target_audience = input.targetAudience || null;
  if (input.scent !== undefined) updateData.scent = input.scent || null;
  if (input.texture !== undefined) updateData.texture = input.texture || null;
  if (input.usageInstructions !== undefined)
    updateData.usage_instructions = input.usageInstructions || null;
  if (input.storageInstructions !== undefined)
    updateData.storage_instructions = input.storageInstructions || null;
  if (input.warnings !== undefined)
    updateData.warnings = input.warnings || null;

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/products");
  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

// Parses various Google Sheets URLs (edit link, publish link, direct export)
// and returns a CSV export URL. Throws if the link shape isn't recognized.
function buildGoogleSheetCsvUrl(input: string): string {
  const trimmed = input.trim();
  // Already a CSV export URL — let it through.
  if (/\bformat=csv\b/.test(trimmed)) return trimmed;

  const idMatch = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) {
    throw new Error("Not a recognized Google Sheets URL");
  }
  const sheetId = idMatch[1];
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheetCsv(
  sheetUrl: string
): Promise<ActionResult<{ csv: string }>> {
  const gate = await getSupplierCompanyId();
  if (!gate.ok) return { success: false, error: gate.error };

  let exportUrl: string;
  try {
    exportUrl = buildGoogleSheetCsvUrl(sheetUrl);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    const res = await fetch(exportUrl, { redirect: "follow" });
    if (!res.ok) {
      return {
        success: false,
        error: `Google Sheets returned ${res.status}. Share the sheet as "Anyone with the link can view" and try again.`,
      };
    }
    const csv = await res.text();
    if (!csv.trim()) {
      return { success: false, error: "Sheet is empty" };
    }
    // Google sometimes returns an HTML sign-in page instead of CSV when the sheet is private.
    if (/<html[\s>]/i.test(csv.slice(0, 200))) {
      return {
        success: false,
        error:
          "Sheet is not public. Share it as \"Anyone with the link can view\" and retry.",
      };
    }
    return { success: true, data: { csv } };
  } catch (e) {
    return { success: false, error: `Failed to fetch sheet: ${(e as Error).message}` };
  }
}

export interface BulkImportRow {
  input: ProductInput;
  imageUrls?: string[];
}

export interface BulkImportResult {
  succeeded: number;
  failed: { rowIndex: number; error: string; name?: string }[];
  imagesDownloaded: number;
  imagesFailed: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Fetches an image URL and stores it in the products bucket. Returns the
// public URL on success, or null on any failure (bad URL, non-image response,
// oversized, upload error). Never throws — we want partial-success imports.
async function downloadAndStoreImage(
  url: string,
  companyId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    const ext = contentType.split("/")[1] || "jpg";
    const path = `supplier-${companyId}/bulk-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("products")
      .upload(path, buf, { contentType, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

// Bulk insert products from a parsed spreadsheet. Each row is validated with the
// same Zod schema as createProduct; failures are collected and reported per-row
// so a partial import is possible. COGS × 1.4 pricing applies to every row.
export async function bulkCreateProducts(
  rows: BulkImportRow[]
): Promise<ActionResult<BulkImportResult>> {
  const gate = await getSupplierCompanyId();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const result: BulkImportResult = {
    succeeded: 0,
    failed: [],
    imagesDownloaded: 0,
    imagesFailed: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const { input, imageUrls } = rows[i];
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      result.failed.push({
        rowIndex: i,
        error: parsed.error.issues[0].message,
        name: input.name,
      });
      continue;
    }

    const listedPrice =
      parsed.data.cogs != null ? parsed.data.cogs * COGS_MARKUP : parsed.data.basePrice;

    const { data: inserted, error } = await supabase.from("products").insert({
      supplier_id: gate.companyId,
      name: parsed.data.name,
      name_local: parsed.data.nameLocal ?? null,
      slug: slugify(parsed.data.name),
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      base_price: Math.round(listedPrice * 100),
      currency: parsed.data.currency,
      moq: parsed.data.moq,
      lead_time_days: parsed.data.leadTimeDays ?? null,
      trade_term: parsed.data.tradeTerm as TradeTerm,
      sample_available: parsed.data.sampleAvailable,
      sample_price: parsed.data.samplePrice
        ? Math.round(parsed.data.samplePrice * 100)
        : null,
      sample_moq: parsed.data.sampleMoq ?? 1,
      weight_kg: parsed.data.weightKg ?? null,
      hs_code: parsed.data.hsCode ?? null,
      origin_country: parsed.data.originCountry ?? null,
      cogs: parsed.data.cogs ? Math.round(parsed.data.cogs * 100) : null,
      brand: parsed.data.brand ?? null,
      jan_code: parsed.data.janCode ?? null,
      shelf_life_days: parsed.data.shelfLifeDays ?? null,
      box_pack_qty: parsed.data.boxPackQty ?? null,
      shipping_mode: parsed.data.shippingMode ?? null,
      legal_category: parsed.data.legalCategory ?? null,
      skin_hair_type: parsed.data.skinHairType ?? null,
      target_audience: parsed.data.targetAudience ?? null,
      scent: parsed.data.scent ?? null,
      texture: parsed.data.texture ?? null,
      usage_instructions: parsed.data.usageInstructions ?? null,
      storage_instructions: parsed.data.storageInstructions ?? null,
      warnings: parsed.data.warnings ?? null,
      moderation_status: "pending",
    }).select("id").single();

    if (error || !inserted) {
      result.failed.push({
        rowIndex: i,
        error: error?.message ?? "Insert failed",
        name: input.name,
      });
      continue;
    }

    result.succeeded += 1;

    // Download and attach any image URLs the sheet provided. A failed image
    // doesn't fail the row — we just report the count.
    if (imageUrls && imageUrls.length > 0) {
      const storedUrls: string[] = [];
      for (const imgUrl of imageUrls) {
        const publicUrl = await downloadAndStoreImage(imgUrl, gate.companyId, supabase);
        if (publicUrl) {
          storedUrls.push(publicUrl);
          result.imagesDownloaded += 1;
        } else {
          result.imagesFailed += 1;
        }
      }
      if (storedUrls.length > 0) {
        await supabase.from("product_images").insert(
          storedUrls.map((u, idx) => ({
            product_id: inserted.id,
            url: u,
            alt_text: input.name,
            is_primary: idx === 0,
            sort_order: idx,
          }))
        );
      }
    }
  }

  if (result.succeeded > 0) revalidatePath("/supplier/products");
  return { success: true, data: result };
}

export async function toggleProductActive(
  productId: string,
  isActive: boolean
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/products");
  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/products");
  return { success: true };
}

export async function addProductImages(
  productId: string,
  images: { url: string; altText?: string; isPrimary?: boolean }[]
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("product_images")
    .select("id", { count: "exact" })
    .eq("product_id", productId);
  const startIndex = existing?.length ?? 0;

  const inserts = images.map((img, i) => ({
    product_id: productId,
    url: img.url,
    alt_text: img.altText ?? null,
    sort_order: startIndex + i,
    is_primary: img.isPrimary ?? (startIndex === 0 && i === 0),
  }));

  const { error } = await supabase.from("product_images").insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

export async function removeProductImage(
  productId: string,
  imageId: string
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

export async function addProductDocuments(
  productId: string,
  docs: {
    url: string;
    certType: string;
    certNumber?: string;
    validUntil?: string;
  }[]
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const inserts = docs.map((d) => ({
    product_id: productId,
    cert_type: d.certType,
    cert_number: d.certNumber ?? null,
    document_url: d.url,
    valid_until: d.validUntil ?? null,
  }));

  const { error } = await supabase
    .from("product_certifications")
    .insert(inserts);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

export async function removeProductDocument(
  productId: string,
  certId: string
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_certifications")
    .delete()
    .eq("id", certId)
    .eq("product_id", productId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

export async function replacePricingTiers(
  productId: string,
  tiers: { minQuantity: number; maxQuantity?: number; unitPrice: number; currency?: string }[]
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const { error: delError } = await supabase
    .from("product_pricing_tiers")
    .delete()
    .eq("product_id", productId);
  if (delError) return { success: false, error: delError.message };

  if (tiers.length === 0) {
    revalidatePath(`/supplier/products/${productId}/edit`);
    return { success: true };
  }

  const inserts = tiers.map((tier) => ({
    product_id: productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity ?? null,
    unit_price: Math.round(tier.unitPrice * 100),
    currency: tier.currency ?? "USD",
  }));

  const { error } = await supabase
    .from("product_pricing_tiers")
    .insert(inserts);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/supplier/products/${productId}/edit`);
  return { success: true };
}

export async function addPricingTiers(
  productId: string,
  tiers: { minQuantity: number; maxQuantity?: number; unitPrice: number; currency?: string }[]
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const inserts = tiers.map((tier) => ({
    product_id: productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity ?? null,
    unit_price: Math.round(tier.unitPrice * 100),
    currency: tier.currency ?? "USD",
  }));

  const { error } = await supabase
    .from("product_pricing_tiers")
    .insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function addProductVariants(
  productId: string,
  variants: { name: string; sku?: string; priceOverride?: number; stockQuantity?: number }[]
): Promise<ActionResult> {
  const own = await assertOwnsProduct(productId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();

  const inserts = variants.map((v) => ({
    product_id: productId,
    name: v.name,
    sku: v.sku ?? null,
    price_override: v.priceOverride ? Math.round(v.priceOverride * 100) : null,
    stock_quantity: v.stockQuantity ?? 0,
  }));

  const { error } = await supabase.from("product_variants").insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
