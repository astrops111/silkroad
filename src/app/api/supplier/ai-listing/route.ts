import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isUnauthorized } from "@/lib/auth/require-auth";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { generateListing } from "@/lib/ai/listing-generator";
import type { LanguageCode } from "@/lib/ai/listing-generator";

/**
 * POST /api/supplier/ai-listing
 * Generate an AI product listing from uploaded photos.
 *
 * Body: { images: [{ base64, mediaType }], sellerNotes?, originCountry?, targetLanguages? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isUnauthorized(auth)) return auth;

  const blocked = await requireAIFeature("ai_listing_generator");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { images, sellerNotes, originCountry, targetLanguages } = body as {
      images: { base64: string; mediaType: string }[];
      sellerNotes?: string;
      originCountry?: string;
      targetLanguages?: LanguageCode[];
    };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "At least one product image is required" },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 images allowed" },
        { status: 400 }
      );
    }

    // Validate image sizes (max 5MB each as base64)
    for (const img of images) {
      const sizeBytes = (img.base64.length * 3) / 4;
      if (sizeBytes > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Each image must be under 5MB" },
          { status: 400 }
        );
      }
    }

    const result = await generateListing({
      imageBase64List: images.map((i) => i.base64),
      imageMediaTypes: images.map((i) => i.mediaType),
      sellerNotes,
      originCountry,
      targetLanguages,
    });

    return NextResponse.json({ success: true, listing: result });
  } catch (error) {
    console.error("AI listing generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate listing",
      },
      { status: 500 }
    );
  }
}
