import { createServiceClient } from "@/lib/supabase/server";

export interface ResolveContactInput {
  userId?: string | null;
  email?: string | null;
  companyId?: string | null;
  fullName?: string | null;
  source?: "platform" | "email" | "manual" | "chatbot";
}

/**
 * Find-or-create a CRM contact.
 * Platform users (buyers AND suppliers) resolve by user_id first — the
 * 00095 backfill created those rows; new signups get one on first touch.
 * External people (email senders, chatbot leads) resolve by email.
 * Returns the contact id, or null if there is nothing to key on.
 */
export async function resolveContact(input: ResolveContactInput): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    if (input.userId) {
      const { data: byUser } = await supabase
        .from("crm_contacts")
        .select("id, company_id")
        .eq("user_id", input.userId)
        .maybeSingle();

      if (byUser) {
        // Late company link (user joined a company after contact creation)
        if (!byUser.company_id && input.companyId) {
          await supabase
            .from("crm_contacts")
            .update({ company_id: input.companyId, updated_at: new Date().toISOString() })
            .eq("id", byUser.id);
        }
        return byUser.id;
      }

      // Platform user without a contact row yet — hydrate from profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, email, phone, country_code")
        .eq("id", input.userId)
        .maybeSingle();

      const { data: created } = await supabase
        .from("crm_contacts")
        .insert({
          user_id: input.userId,
          company_id: input.companyId ?? null,
          full_name: profile?.full_name ?? input.fullName ?? null,
          email: profile?.email ?? input.email ?? null,
          phone: profile?.phone ?? null,
          country_code: profile?.country_code ?? null,
          source: "platform",
        })
        .select("id")
        .single();

      return created?.id ?? null;
    }

    const email = input.email?.toLowerCase().trim();
    if (!email) return null;

    // A platform user with this email? Link through user_id path instead.
    const { data: profileByEmail } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail) {
      return resolveContact({ ...input, userId: profileByEmail.id });
    }

    const { data: byEmail } = await supabase
      .from("crm_contacts")
      .select("id")
      .is("user_id", null)
      .ilike("email", email)
      .maybeSingle();

    if (byEmail) return byEmail.id;

    const { data: created, error } = await supabase
      .from("crm_contacts")
      .insert({
        email,
        full_name: input.fullName ?? null,
        company_id: input.companyId ?? null,
        source: input.source ?? "email",
      })
      .select("id")
      .single();

    // Unique-index race: another process created it between select and insert
    if (error?.code === "23505") {
      const { data: raced } = await supabase
        .from("crm_contacts")
        .select("id")
        .is("user_id", null)
        .ilike("email", email)
        .maybeSingle();
      return raced?.id ?? null;
    }

    return created?.id ?? null;
  } catch (err) {
    console.error("[crm/contacts] resolveContact error:", err);
    return null;
  }
}
