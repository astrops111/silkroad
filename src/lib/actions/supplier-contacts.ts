"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { PlatformRole } from "@/lib/supabase/database.types";
import { canSupply } from "@/lib/company-access";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const SUPPLIER_ROLES: PlatformRole[] = [
  "supplier_owner",
  "supplier_sales",
  "supplier_catalog",
  "supplier_warehouse",
];

function isSupplierRole(r: string): r is PlatformRole {
  return (SUPPLIER_ROLES as string[]).includes(r);
}

async function requireOwner() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];
  if (!membership) return { ok: false as const, error: "Not signed in" };
  if (!canSupply(membership.companies?.type)) {
    return { ok: false as const, error: "Supplier accounts only" };
  }
  if (membership.role !== "supplier_owner") {
    return { ok: false as const, error: "Only the owner can manage team" };
  }
  return {
    ok: true as const,
    companyId: membership.company_id,
    userId: membership.user_id,
  };
}

export async function inviteContactByEmail(input: {
  email: string;
  role: PlatformRole;
}): Promise<ActionResult<{ memberId: string }>> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, error: gate.error };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "Invalid email" };
  }
  if (!isSupplierRole(input.role)) {
    return { success: false, error: "Invalid role" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      success: false,
      error:
        "No user with that email has signed up yet. Ask them to register first, then try again.",
    };
  }

  const { data: existingMember } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", gate.companyId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existingMember) {
    return { success: false, error: "Already a member of your team" };
  }

  const { data: inserted, error } = await supabase
    .from("company_members")
    .insert({
      company_id: gate.companyId,
      user_id: profile.id,
      role: input.role,
      invited_by: gate.userId,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/supplier/contacts");
  return { success: true, data: { memberId: inserted.id } };
}

export async function updateContactRole(
  memberId: string,
  role: PlatformRole
): Promise<ActionResult> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, error: gate.error };

  if (!isSupplierRole(role)) {
    return { success: false, error: "Invalid role" };
  }

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, is_primary")
    .eq("id", memberId)
    .single();

  if (!member || member.company_id !== gate.companyId) {
    return { success: false, error: "Member not found" };
  }

  if (member.is_primary && role !== "supplier_owner") {
    return { success: false, error: "The primary contact must be the owner" };
  }

  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/supplier/contacts");
  return { success: true };
}

export async function removeContact(memberId: string): Promise<ActionResult> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, is_primary")
    .eq("id", memberId)
    .single();

  if (!member || member.company_id !== gate.companyId) {
    return { success: false, error: "Member not found" };
  }
  if (member.is_primary) {
    return { success: false, error: "Can't remove the primary contact" };
  }
  if (member.user_id === gate.userId) {
    return { success: false, error: "Can't remove yourself" };
  }

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/supplier/contacts");
  return { success: true };
}

export async function setPrimaryContact(
  memberId: string
): Promise<ActionResult> {
  const gate = await requireOwner();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("company_members")
    .select("id, company_id, role")
    .eq("id", memberId)
    .single();

  if (!target || target.company_id !== gate.companyId) {
    return { success: false, error: "Member not found" };
  }
  if (target.role !== "supplier_owner") {
    return { success: false, error: "Only an owner can be the primary contact" };
  }

  const { error: clearError } = await supabase
    .from("company_members")
    .update({ is_primary: false })
    .eq("company_id", gate.companyId)
    .eq("is_primary", true);
  if (clearError) return { success: false, error: clearError.message };

  const { error } = await supabase
    .from("company_members")
    .update({ is_primary: true })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/supplier/contacts");
  return { success: true };
}
