"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import type { Tables } from "@/lib/supabase/database.types";

export type Category = Tables<"categories">;
export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

const getCategoriesCached = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return data ?? [];
  },
  ["categories-active"],
  { revalidate: 300, tags: ["catalog"] }
);

// Public catalog category list — read on nearly every page. Cached (300s) via
// the cookieless service client; admin management uses the uncached
// getAllCategoriesForAdmin / getAdminCategoryTree below.
export async function getCategories(): Promise<Category[]> {
  return getCategoriesCached();
}

export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const categories = await getCategories();
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getSubcategoriesByParentSlug(
  parentSlug: string
): Promise<Category[]> {
  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", parentSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!parent?.id) return [];
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parent.id)
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function getAllCategoriesForAdmin(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("level")
    .order("sort_order")
    .order("name");
  return data ?? [];
}

export async function getAdminCategoryTree(): Promise<CategoryWithChildren[]> {
  const all = await getAllCategoriesForAdmin();
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  for (const cat of all) map.set(cat.id, { ...cat, children: [] });
  for (const cat of all) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getCategoryProductCounts(): Promise<Record<string, number>> {
  return getCategoryProductCountsCached();
}

// Full-catalog scan (category_id over 15k+ products) that previously ran on
// every marketplace/home render — cached (300s) via the cookieless service
// client to stop the repeated full-table egress.
const getCategoryProductCountsCached = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createServiceClient();
    // Supabase caps unbounded selects at ~1000 rows — this catalog has 15k+
    // products, so this must be paginated or counts are silently truncated.
    const counts: Record<string, number> = {};
    let from = 0;
    const PAGE = 1000;
    for (;;) {
      const { data } = await supabase
        .from("products")
        .select("category_id")
        .not("category_id", "is", null)
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      for (const row of data) {
        const id = (row as { category_id: string | null }).category_id;
        if (id) counts[id] = (counts[id] ?? 0) + 1;
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return counts;
  },
  ["category-product-counts"],
  { revalidate: 300, tags: ["catalog"] }
);

export type TopCategoryWithCount = Category & { productCount: number };

export async function getTopLevelCategoriesWithCount(): Promise<TopCategoryWithCount[]> {
  const [all, directCounts] = await Promise.all([
    getCategories(),
    getCategoryProductCounts(),
  ]);

  const parentOf = new Map<string, string | null>();
  for (const c of all) parentOf.set(c.id, c.parent_id);

  function topAncestor(id: string): string | null {
    let current: string | null = id;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const next: string | null = parentOf.get(current) ?? null;
      if (!next) return current;
      current = next;
    }
    return null;
  }

  const rollup: Record<string, number> = {};
  for (const [catId, count] of Object.entries(directCounts)) {
    const root = topAncestor(catId);
    if (!root) continue;
    rollup[root] = (rollup[root] ?? 0) + count;
  }

  return all
    .filter((c) => c.parent_id === null)
    .map((c) => ({ ...c, productCount: rollup[c.id] ?? 0 }));
}
