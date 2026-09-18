import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 (S3-compatible) client for public product images.
// Buckets `products` / `product-images` on Supabase Storage were migrated
// here to eliminate Supabase egress-quota exhaustion — see
// scripts/migrate-images-to-r2.mjs for the one-time backfill.

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "buy-product-images";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    );
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function getR2PublicUrl(path: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error("R2 not configured: set R2_PUBLIC_URL");
  }
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${path}`;
}

export async function uploadToR2(
  path: string,
  body: Uint8Array,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return getR2PublicUrl(path);
}
