import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST   /api/admin/trade-flows/[id]/documents — attach a document reference.
 *          { kind, fileUrl?, fileName?, note? }
 *          (upload the file first via POST /api/upload, bucket "documents")
 * DELETE /api/admin/trade-flows/[id]/documents?documentId=… — remove one.
 */

const DOC_KINDS = new Set([
  "quote_request",
  "supplier_invoice",
  "buyer_invoice",
  "buyer_payment_proof",
  "supplier_payment_proof",
  "seaway_bill",
  "ebm",
  "other",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const {
    kind,
    fileUrl,
    filePath,
    fileName,
    note,
  }: { kind?: string; fileUrl?: string; filePath?: string; fileName?: string; note?: string } = body;

  if (!kind || !DOC_KINDS.has(kind)) {
    return NextResponse.json({ error: "A valid document kind is required" }, { status: 400 });
  }
  if (!fileUrl && !filePath && !note) {
    return NextResponse.json({ error: "fileUrl, filePath or note is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // The "documents" bucket is private — a public URL would 403 for buyers and
  // in emails, so store a long-lived signed URL instead (POD pattern).
  let resolvedUrl = fileUrl || null;
  if (filePath) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) resolvedUrl = signed.signedUrl;
  }
  const { data: flow } = await supabase
    .from("trade_flows")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!flow) return NextResponse.json({ error: "Trade flow not found" }, { status: 404 });

  const { data: doc, error } = await supabase
    .from("trade_flow_documents")
    .insert({
      trade_flow_id: id,
      kind,
      file_url: resolvedUrl,
      file_name: fileName || null,
      note: note || null,
      uploaded_by: admin.profile.id,
    })
    .select("id, kind, file_url, file_name, note, created_at")
    .single();

  if (error || !doc) {
    console.error("[admin/trade-flows/documents] insert failed:", error);
    return NextResponse.json({ error: "Failed to attach document" }, { status: 500 });
  }
  return NextResponse.json({ success: true, document: doc });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id } = await params;
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("trade_flow_documents")
    .delete()
    .eq("id", documentId)
    .eq("trade_flow_id", id);

  if (error) {
    console.error("[admin/trade-flows/documents] delete failed:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
