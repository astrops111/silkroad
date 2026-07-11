import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type MailboxPermission = "read" | "send" | "manage";

/**
 * Server-side mirror of the can_access_mailbox() RLS helper, with the
 * permission LEVEL the RLS layer doesn't distinguish: reading a mailbox
 * is granted by RLS, but sending/managing requires an explicit level.
 *
 * admin_super → manage on everything.
 * personal mailbox owner → manage on their own box.
 * otherwise → the granted mailbox_permissions.permission (or null).
 */
export async function getMailboxPermission(
  supabase: DB,
  mailboxId: string,
  profileId: string,
  role: string
): Promise<MailboxPermission | null> {
  if (role === "admin_super") return "manage";

  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("owner_user_id")
    .eq("id", mailboxId)
    .maybeSingle();

  if (mailbox?.owner_user_id === profileId) return "manage";

  const { data: grant } = await supabase
    .from("mailbox_permissions")
    .select("permission")
    .eq("mailbox_id", mailboxId)
    .eq("user_id", profileId)
    .maybeSingle();

  return (grant?.permission as MailboxPermission | undefined) ?? null;
}

const LEVEL_ORDER: Record<MailboxPermission, number> = { read: 1, send: 2, manage: 3 };

export function permissionAtLeast(
  actual: MailboxPermission | null,
  required: MailboxPermission
): boolean {
  if (!actual) return false;
  return LEVEL_ORDER[actual] >= LEVEL_ORDER[required];
}
