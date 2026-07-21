import { notFound, permanentRedirect } from "next/navigation";
import { getProductWithSupplier, resolveProductIdByPrefix } from "@/lib/queries/products";
import { getPoolingInfoByProductIds } from "@/lib/queries/marketplace";
import { volumeCbmFromDimensions } from "@/lib/logistics/rates/config";
import { buildProductPath, isUuid, extractIdPrefix } from "@/lib/product-url";
import ProductDetailClient from "./product-detail-client";
import { RecommendationRail } from "@/components/ai/recommendation-rail";

export const dynamic = "force-dynamic";

// Resolve the incoming path to a full product id.
//   /marketplace/{uuid}                             → legacy id (redirected below)
//   /marketplace/{region}/{cat}/.../{slug}-{prefix} → SEO URL, resolved by prefix
async function resolveProductId(slug: string[]): Promise<string | null> {
  if (slug.length === 1 && isUuid(slug[0])) return slug[0];
  const last = slug[slug.length - 1] ?? "";
  const prefix = extractIdPrefix(last);
  if (!prefix) return null;
  return resolveProductIdByPrefix(prefix);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  const productId = await resolveProductId(slug);
  if (!productId) notFound();

  const { product } = await getProductWithSupplier(productId);
  if (!product) notFound();
  // Inactive or unapproved listings are not visible to buyers.
  if (!product.is_active || product.moderation_status !== "approved") notFound();

  // Enforce the canonical SEO URL — legacy /marketplace/{id} links and any stale
  // region/category/slug in the path 301 here.
  const canonical = buildProductPath({
    id: product.id,
    slug: product.slug,
    name: product.name,
    origin_country: product.origin_country,
    category_path: product.categories?.path ?? null,
  });
  const requested = `/marketplace/${slug.join("/")}`;
  if (requested !== canonical) permanentRedirect(canonical);

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

  const volumeCbm = volumeCbmFromDimensions(product.dimensions_cm) ?? null;

  const pooling = (await getPoolingInfoByProductIds([product.id]))[product.id] ?? null;

  // Amazon-style size/pack variants — each falls back to the parent
  // product's price/MOQ/box pack/barcode/images when it doesn't override them.
  const variants = (product.product_variants ?? [])
    .filter((v) => v.is_active)
    .map((v) => {
      const variantImages = (product.product_images ?? [])
        .filter((img) => img.variant_id === v.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.alt_text ?? product.name,
          isPrimary: img.is_primary ?? false,
        }));
      return {
        id: v.id,
        name: v.name,
        janCode: v.jan_code ?? product.jan_code ?? null,
        moq: v.moq ?? product.moq ?? 1,
        boxPackQty: v.box_pack_qty ?? product.box_pack_qty ?? null,
        priceOverride: v.price_override != null ? v.price_override / 100 : null,
        isDefault: v.is_default,
        images: variantImages.length > 0 ? variantImages : images,
      };
    })
    .sort((a, b) => (a.priceOverride ?? 0) - (b.priceOverride ?? 0));

  return (
    <>
    <ProductDetailClient
      product={{
        id: product.id,
        supplierId: product.supplier_id,
        supplierName: product.companies?.name ?? "",
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
        volumeCbm,
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
        minOrderAmount: product.min_order_amount != null ? product.min_order_amount / 100 : null,
        minOrderGroupedBy: product.min_order_grouped_by ?? null,
        poolingType: pooling?.pooling_group_type ?? null,
        groupMinOrderAmount: pooling?.group_min_order_amount ?? null,
        labels: (product.product_labels ?? [])
          .map((pl) => pl.labels?.name)
          .filter((n): n is string => Boolean(n)),
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
      variants={variants}
    />
    <RecommendationRail title="Related products" productId={product.id} />
    </>
  );
}
