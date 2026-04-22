"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const WRITE_ROLES = ["admin_super", "admin_moderator"];

async function requireAdminWrite() {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { ok: false as const, error: "Forbidden" };
  }
  return { ok: true as const, role };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CategoryInput {
  name: string;
  nameLocal?: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export async function createCategory(
  input: CategoryInput
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.ok) return { success: false, error: gate.error };

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  const supabase = await createClient();

  let level = 0;
  let path: string | null = null;
  if (input.parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id, level, path, slug")
      .eq("id", input.parentId)
      .single();
    if (!parent) {
      return { success: false, error: "Parent category not found" };
    }
    level = (parent.level ?? 0) + 1;
    path = parent.path ? `${parent.path}/${parent.slug}` : parent.slug;
  }

  const slug = input.slug?.trim() || slugify(name);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      name_local: input.nameLocal ?? null,
      slug,
      parent_id: input.parentId ?? null,
      level,
      path,
      description: input.description ?? null,
      icon: input.icon ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/superadmin/categories");
  return { success: true, data: { id: data.id } };
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput> & { isActive?: boolean }
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.nameLocal !== undefined) patch.name_local = input.nameLocal;
  if (input.slug !== undefined) patch.slug = input.slug.trim() || slugify(input.name ?? "");
  if (input.description !== undefined) patch.description = input.description;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/superadmin/categories");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.ok) return { success: false, error: gate.error };
  if (gate.role !== "admin_super") {
    return { success: false, error: "Only super admins can delete categories" };
  }

  const supabase = await createClient();

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((productCount ?? 0) > 0) {
    return {
      success: false,
      error: `Cannot delete — ${productCount} product(s) still use this category. Reassign or archive instead.`,
    };
  }

  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);
  if ((childCount ?? 0) > 0) {
    return { success: false, error: "Delete or move subcategories first" };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/superadmin/categories");
  return { success: true };
}

export async function reorderCategories(
  orderedIds: string[]
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const updates = orderedIds.map((id, i) =>
    supabase
      .from("categories")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/superadmin/categories");
  return { success: true };
}
