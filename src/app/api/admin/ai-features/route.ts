import { NextRequest, NextResponse } from "next/server";
import { getAllAIFeatures, toggleAIFeature, updateAIFeatureConfig } from "@/lib/ai/feature-flags";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/ai-features — List all AI feature flags
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const features = await getAllAIFeatures();
  return NextResponse.json({ features });
}

/**
 * PATCH /api/admin/ai-features — Toggle or configure a feature
 * Body: { featureId, enabled?, config? }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { featureId, enabled, config } = await request.json();

  if (!featureId) {
    return NextResponse.json({ error: "featureId is required" }, { status: 400 });
  }

  // Toggle enabled/disabled
  if (typeof enabled === "boolean") {
    const result = await toggleAIFeature(featureId, enabled, "admin");
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  // Update config
  if (config && typeof config === "object") {
    const result = await updateAIFeatureConfig(featureId, config, "admin");
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
