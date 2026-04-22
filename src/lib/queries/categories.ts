"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Category = Tables<"categories">;
export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("category_id")
    .not("category_id", "is", null);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { category_id: string | null }).category_id;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

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
