import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

const SIGNED_URL_TTL_SECONDS = 300;

/**
 * GET /api/admin/mail/attachments/[id] — Short-lived signed download URL.
 * Table + storage RLS both enforce per-user mailbox access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();

  const { data: attachment } = await supabase
    .from("email_attachments")
    .select("storage_path, filename, content_type")
    .eq("id", id)
    .maybeSingle();

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("email-attachments")
    .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: attachment.filename ?? true,
    });

  if (error || !signed) {
    console.error("[admin/mail/attachments]", error);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    filename: attachment.filename,
    contentType: attachment.content_type,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
