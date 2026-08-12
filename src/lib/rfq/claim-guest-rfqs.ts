import { createServiceClient } from "@/lib/supabase/server";

/**
 * Attach RFQs submitted anonymously from /cart to the account that later
 * registered with the same email (see 00136_guest_rfqs.sql).
 *
 * Called after sign-in and after the email-confirmation callback rather than
 * at sign-up, so it also picks up an RFQ a buyer sends as a guest *after*
 * they already have an account but before they next log in.
 *
 * Security: the claim is keyed on email alone, so it only runs once Supabase
 * reports the address as confirmed. Without that guard, registering with
 * someone else's address would hand over their quote history — product list,
 * quantities and target prices included.
 *
 * Never throws: a failed claim must not block a login.
 */
export async function claimGuestRfqs(authUserId: string): Promise<number> {
  try {
    const admin = createServiceClient();

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(authUserId);
    if (authErr || !authUser?.user) return 0;

    // Unconfirmed address — no proof this person owns the inbox the guest
    // RFQ was sent from. Skip; a later login re-runs this.
    if (!authUser.user.email_confirmed_at) return 0;

    const email = authUser.user.email?.toLowerCase().trim();
    if (!email) return 0;

    const { data: profile } = await admin
      .from("user_profiles")
      .select("id")
      .eq("auth_id", authUserId)
      .maybeSingle();
    if (!profile) return 0;

    const { data: membership } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", profile.id)
      .limit(1)
      .maybeSingle();

    // guest_email is written lowercased by /api/rfqs/from-cart, so an exact
    // match is safe here. The guest_* columns stay in place as the record of
    // how the RFQ arrived.
    const { data: claimed, error } = await admin
      .from("rfqs")
      .update({
        buyer_user_id: profile.id,
        ...(membership?.company_id ? { buyer_company_id: membership.company_id } : {}),
      })
      .is("buyer_user_id", null)
      .eq("guest_email", email)
      .select("id, rfq_number");

    if (error) {
      console.error("[claimGuestRfqs] update failed:", error);
      return 0;
    }
    if (!claimed?.length) return 0;

    // Keep the CRM side consistent — those deal threads were opened with no
    // buyer company because the guest had none.
    if (membership?.company_id) {
      const { error: threadErr } = await admin
        .from("deal_threads")
        .update({ buyer_company_id: membership.company_id })
        .is("buyer_company_id", null)
        .in(
          "rfq_id",
          claimed.map((r) => r.id)
        );
      if (threadErr) {
        console.error("[claimGuestRfqs] deal_threads backfill failed:", threadErr);
      }
    }

    console.log(
      `[claimGuestRfqs] linked ${claimed.length} guest RFQ(s) to profile ${profile.id}:`,
      claimed.map((r) => r.rfq_number).join(", ")
    );
    return claimed.length;
  } catch (err) {
    console.error("[claimGuestRfqs] unexpected failure:", err);
    return 0;
  }
}
