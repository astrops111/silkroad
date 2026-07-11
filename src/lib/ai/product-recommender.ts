import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================
// Product recommendations — co-demand (products RFQ'd/ordered
// together) + category affinity, cached per subject. Semantic
// embedding similarity is intentionally out of scope until an
// embeddings vendor is chosen (Anthropic has no embeddings API).
// ============================================================

const CACHE_TTL_HOURS = 24;
const DEFAULT_LIMIT = 8;

export interface Recommendation {
  product_id: string;
  score: number;
  reason: string;
}

export interface RecommendedProduct extends Recommendation {
  name: string;
  slug: string;
  base_price: number;
  currency: string | null;
  moq: number | null;
}

async function readCache(subjectType: string, subjectId: string): Promise<Recommendation[] | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("product_recommendations")
    .select("recommended, expires_at")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.recommended as unknown as Recommendation[];
}

async function writeCache(
  subjectType: string,
  subjectId: string,
  recommended: Recommendation[]
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("product_recommendations").upsert(
    {
      subject_type: subjectType,
      subject_id: subjectId,
      recommended: recommended as unknown as Json,
      computed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString(),
    },
    { onConflict: "subject_type,subject_id" }
  );
}

/** Hydrate recommendation ids with public catalog fields. */
async function hydrate(recommendations: Recommendation[]): Promise<RecommendedProduct[]> {
  if (recommendations.length === 0) return [];
  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, base_price, currency, moq, is_active")
    .in("id", recommendations.map((r) => r.product_id))
    .eq("is_active", true);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  return recommendations
    .map((r) => {
      const p = byId.get(r.product_id);
      if (!p) return null;
      return {
        ...r,
        name: p.name,
        slug: p.slug,
        base_price: p.base_price,
        currency: p.currency,
        moq: p.moq,
      };
    })
    .filter((r): r is RecommendedProduct => Boolean(r));
}

/**
 * "Related products" for a product page: co-demanded products (appear in
 * the same RFQs) ranked first, padded with popular same-category actives.
 */
export async function recommendForProduct(
  productId: string,
  limit = DEFAULT_LIMIT
): Promise<RecommendedProduct[]> {
  const cached = await readCache("product", productId);
  if (cached) return hydrate(cached.slice(0, limit));

  const supabase = createServiceClient();
  const scores = new Map<string, Recommendation>();

  // Co-demand: other products in the same RFQs
  const { data: myRfqItems } = await supabase
    .from("rfq_items")
    .select("rfq_id")
    .eq("product_id", productId)
    .limit(200);
  const rfqIds = Array.from(new Set((myRfqItems ?? []).map((i) => i.rfq_id)));

  if (rfqIds.length > 0) {
    const { data: coItems } = await supabase
      .from("rfq_items")
      .select("product_id")
      .in("rfq_id", rfqIds)
      .neq("product_id", productId)
      .not("product_id", "is", null)
      .limit(500);

    for (const item of coItems ?? []) {
      if (!item.product_id) continue;
      const existing = scores.get(item.product_id);
      scores.set(item.product_id, {
        product_id: item.product_id,
        score: (existing?.score ?? 0) + 1,
        reason: "requested together in RFQs",
      });
    }
  }

  // Category affinity padding
  const { data: product } = await supabase
    .from("products")
    .select("category_id")
    .eq("id", productId)
    .maybeSingle();

  if (product?.category_id) {
    const { data: sameCategory } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", product.category_id)
      .eq("is_active", true)
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    for (const p of sameCategory ?? []) {
      if (!scores.has(p.id)) {
        scores.set(p.id, { product_id: p.id, score: 0.3, reason: "same category" });
      }
    }
  }

  const ranked = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);

  await writeCache("product", productId, ranked);
  return hydrate(ranked.slice(0, limit));
}

/**
 * Buyer-personalized picks: top categories from their RFQ/order history,
 * newest active products in those categories they haven't RFQ'd yet.
 */
export async function recommendForBuyer(
  profileId: string,
  limit = DEFAULT_LIMIT
): Promise<RecommendedProduct[]> {
  const cached = await readCache("user", profileId);
  if (cached) return hydrate(cached.slice(0, limit));

  const supabase = createServiceClient();

  const { data: myRfqs } = await supabase
    .from("rfqs")
    .select("id")
    .eq("buyer_user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rfqIds = (myRfqs ?? []).map((r) => r.id);
  if (rfqIds.length === 0) return [];

  const { data: historyItems } = await supabase
    .from("rfq_items")
    .select("product_id, products ( category_id )")
    .in("rfq_id", rfqIds)
    .not("product_id", "is", null);

  const seenProducts = new Set<string>();
  const categoryCounts = new Map<string, number>();
  for (const item of historyItems ?? []) {
    if (item.product_id) seenProducts.add(item.product_id);
    const category = (item.products as unknown as { category_id: string | null } | null)?.category_id;
    if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  if (topCategories.length === 0) return [];

  const { data: candidates } = await supabase
    .from("products")
    .select("id, category_id")
    .in("category_id", topCategories)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  const ranked: Recommendation[] = (candidates ?? [])
    .filter((p) => !seenProducts.has(p.id))
    .map((p) => ({
      product_id: p.id,
      score: (categoryCounts.get(p.category_id ?? "") ?? 1) / 10,
      reason: "matches your sourcing history",
    }))
    .slice(0, limit * 2);

  await writeCache("user", profileId, ranked);
  return hydrate(ranked.slice(0, limit));
}
