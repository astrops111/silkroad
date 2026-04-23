import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { getProductById } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { canSupply } from "@/lib/company-access";
import EditProductForm from "./edit-product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, categories, { product }] = await Promise.all([
    getCurrentUser(),
    getCategories(),
    getProductById(id),
  ]);

  const membership = user?.company_members?.find((m) =>
    canSupply(m.companies?.type)
  );
  if (!membership) {
    redirect("/dashboard");
  }
  if (!product) notFound();
  if (product.supplier_id !== membership.company_id) {
    redirect("/supplier/products");
  }

  return (
    <EditProductForm
      product={{
        id: product.id,
        name: product.name,
        nameLocal: product.name_local,
        description: product.description,
        categoryId: product.category_id,
        basePrice: product.base_price,
        cogs: product.cogs ?? null,
        currency: product.currency,
        moq: product.moq,
        leadTimeDays: product.lead_time_days,
        tradeTerm: product.trade_term,
        originCountry: product.origin_country,
        brand: product.brand ?? null,
        sampleAvailable: product.sample_available ?? false,
        samplePrice: product.sample_price,
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
        isActive: product.is_active ?? true,
        moderationStatus: product.moderation_status,
      }}
      images={product.product_images.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.alt_text ?? null,
        isPrimary: img.is_primary ?? false,
        sortOrder: img.sort_order ?? 0,
      }))}
      docs={product.product_certifications.map((d) => ({
        id: d.id,
        url: d.document_url ?? "",
        certType: d.cert_type,
        certNumber: d.cert_number,
        validUntil: d.valid_until,
      }))}
      tiers={product.product_pricing_tiers
        .sort((a, b) => a.min_quantity - b.min_quantity)
        .map((t) => ({
          minQuantity: t.min_quantity,
          maxQuantity: t.max_quantity,
          unitPrice: t.unit_price,
        }))}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level ?? 0,
        parentId: c.parent_id,
      }))}
      supplierCompanyId={membership.company_id}
    />
  );
}
