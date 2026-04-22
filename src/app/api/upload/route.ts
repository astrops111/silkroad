import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeStoragePath } from "@/lib/security/sanitize";

/**
 * POST /api/upload — Upload a file to Supabase Storage
 *
 * Supports: product images, chat attachments, business docs, RFQ specs, POD photos
 *
 * Body: FormData with:
 *   file     — the file to upload
 *   bucket   — storage bucket: "products", "messages", "documents", "invoices"
 *   folder   — optional subfolder path (e.g., "supplier-123/")
 *
 * Returns: { url, path, fileName, fileType, fileSize }
 */

const ALLOWED_BUCKETS = ["products", "messages", "documents", "invoices"] as const;

const MAX_SIZES: Record<string, number> = {
  products: 10 * 1024 * 1024,   // 10MB for product images
  messages: 25 * 1024 * 1024,   // 25MB for chat attachments
  documents: 50 * 1024 * 1024,  // 50MB for business docs
  invoices: 10 * 1024 * 1024,   // 10MB for invoices
};

const ALLOWED_TYPES: Record<string, string[]> = {
  products: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  messages: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  documents: ["image/jpeg", "image/png", "image/webp", "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  invoices: ["application/pdf", "image/jpeg", "image/png"],
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as string || "documents";
  const folder = formData.get("folder") as string || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.includes(bucket as typeof ALLOWED_BUCKETS[number])) {
    return NextResponse.json({ error: `Invalid bucket: ${bucket}` }, { status: 400 });
  }

  // Validate file size
  const maxSize = MAX_SIZES[bucket] || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum: ${maxSize / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Validate file type
  const allowedTypes = ALLOWED_TYPES[bucket] || [];
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 400 }
    );
  }

  const rawExt = (file.name.split(".").pop() || "bin").toLowerCase();
  const ext = /^[a-z0-9]{1,6}$/.test(rawExt) ? rawExt : "bin";
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  const safeName = `${timestamp}-${rand}.${ext}`;
  const safeFolder = folder ? sanitizeStoragePath(folder) : "";
  if (safeFolder.length > 200) {
    return NextResponse.json({ error: "Folder path too long" }, { status: 400 });
  }
  const path = `${safeFolder}${safeName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({
    url: urlData.publicUrl,
    path: data.path,
    bucket,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });
}
