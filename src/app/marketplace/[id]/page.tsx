import { notFound } from "next/navigation";
import { getProductWithSupplier } from "@/lib/queries/products";
import ProductDetailClient from "./product-detail-client";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { product } = await getProductWithSupplier(id);

  if (!product) notFound();
  // Inactive or unapproved listings are not visible to buyers.
  if (!product.is_active || product.moderation_status !== "approved") notFound();

  const images = (product.product_images ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.alt_text ?? product.name,
      isPrimary: img.is_primary ?? false,
    }));

  // Move primary to front if not already there
  const primaryIdx = images.findIndex((i) => i.isPrimary);
  if (primaryIdx > 0) {
    const [p] = images.splice(primaryIdx, 1);
    images.unshift(p);
  }

  const tiers = (product.product_pricing_tiers ?? [])
    .sort((a, b) => a.min_quantity - b.min_quantity)
    .map((t) => ({
      minQuantity: t.min_quantity,
      maxQuantity: t.max_quantity,
      unitPrice: t.unit_price / 100,
      currency: t.currency ?? "USD",
    }));

  const certifications = (product.product_certifications ?? []).map((c) => ({
    id: c.id,
    certType: c.cert_type,
    certNumber: c.cert_number,
    documentUrl: c.document_url,
    validUntil: c.valid_until,
  }));

  return (
    <ProductDetailClient
      product={{
        id: product.id,
        name: product.name,
        nameLocal: product.name_local,
        description: product.description ?? "",
        basePrice: product.base_price / 100,
        currency: product.currency ?? "USD",
        moq: product.moq ?? 1,
        leadTimeDays: product.lead_time_days,
        brand: product.brand,
        originCountry: product.origin_country,
        weightKg: product.weight_kg,
        hsCode: product.hs_code,
        janCode: product.jan_code ?? null,
        shelfLifeDays: product.shelf_life_days ?? null,
        boxPackQty: product.box_pack_qty ?? null,
        shippingMode: product.shipping_mode ?? null,
        legalCategory: product.legal_category ?? null,
        skinHairType: product.skin_hair_type ?? null,
        targetAudience: product.target_audience ?? null,
        scent: product.scent ?? null,
        texture: product.texture ?? null,
        usageInstructions: product.usage_instructions ?? null,
        storageInstructions: product.storage_instructions ?? null,
        warnings: product.warnings ?? null,
        sampleAvailable: product.sample_available ?? false,
        samplePrice: product.sample_price != null ? product.sample_price / 100 : null,
      }}
      category={
        product.categories
          ? {
              name: product.categories.name,
              slug: product.categories.slug,
            }
          : null
      }
      images={images}
      tiers={tiers}
      certifications={certifications}
    />
  );
}
