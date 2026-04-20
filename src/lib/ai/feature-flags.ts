import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface AIFeatureFlag {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}

/**
 * Check if an AI feature is enabled.
 * Returns false if the feature doesn't exist or is disabled.
 */
export async function isAIFeatureEnabled(featureId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feature_flags")
    .select("is_enabled")
    .eq("id", featureId)
    .single();

  return data?.is_enabled ?? false;
}

/**
 * Get all AI feature flags with their status.
 */
export async function getAllAIFeatures(): Promise<AIFeatureFlag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feature_flags")
    .select("*")
    .order("category")
    .order("name");

  return (data ?? []) as AIFeatureFlag[];
}

/**
 * Toggle an AI feature on or off. Admin-only.
 */
export async function toggleAIFeature(
  featureId: string,
  enabled: boolean,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_feature_flags")
    .update({
      is_enabled: enabled,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", featureId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Update feature-specific configuration. Admin-only.
 */
export async function updateAIFeatureConfig(
  featureId: string,
  config: Record<string, unknown>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_feature_flags")
    .update({
      config,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", featureId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Guard for API routes — returns 403 if feature is disabled.
 * Use at the top of AI-powered API route handlers.
 */
export async function requireAIFeature(featureId: string): Promise<string | null> {
  const enabled = await isAIFeatureEnabled(featureId);
  if (!enabled) {
    return `AI feature "${featureId}" is currently disabled by the administrator.`;
  }
  return null;
}
