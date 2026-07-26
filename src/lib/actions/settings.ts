"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface UserSettingsData {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  preferredLocale: string;
  preferredCurrency: string;
  emailNotifications: boolean;
  orderUpdates: boolean;
  rfqAlerts: boolean;
  promotionalEmails: boolean;
}

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, phone, country_code, preferred_locale, preferred_currency")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return null;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email, order_updates, rfq_updates, marketing")
    .eq("user_id", profile.id)
    .maybeSingle();

  return {
    fullName: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    countryCode: profile.country_code ?? "",
    preferredLocale: profile.preferred_locale ?? "en",
    preferredCurrency: profile.preferred_currency ?? "USD",
    emailNotifications: prefs?.email ?? true,
    orderUpdates: prefs?.order_updates ?? true,
    rfqAlerts: prefs?.rfq_updates ?? true,
    promotionalEmails: prefs?.marketing ?? false,
  };
}

export interface RegionPreference {
  countryCode: string;
  currencyCode: string;
}

// Lightweight counterpart to getUserSettings/updateUserSettings — used by the
// site-wide RegionPicker, which only ever knows country+currency and must not
// clobber the rest of the profile (full name, phone, notification prefs) the
// way passing a partial payload through updateUserSettings would.
export async function getRegionPreference(): Promise<RegionPreference | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("country_code, preferred_currency")
    .eq("auth_id", user.id)
    .single();
  if (!profile?.country_code) return null;

  return {
    countryCode: profile.country_code,
    currencyCode: profile.preferred_currency ?? "USD",
  };
}

export async function updateRegionPreference(
  countryCode: string,
  currencyCode: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Profile not found" };

  const { error } = await supabase
    .from("user_profiles")
    .update({
      country_code: countryCode,
      preferred_currency: currencyCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function updateUserSettings(
  data: Omit<UserSettingsData, "email">
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Profile not found" };

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      full_name: data.fullName || null,
      phone: data.phone || null,
      country_code: data.countryCode || null,
      preferred_locale: data.preferredLocale,
      preferred_currency: data.preferredCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (profileError) return { success: false, error: profileError.message };

  const { error: prefsError } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: profile.id,
        email: data.emailNotifications,
        order_updates: data.orderUpdates,
        rfq_updates: data.rfqAlerts,
        marketing: data.promotionalEmails,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (prefsError) return { success: false, error: prefsError.message };

  return { success: true };
}
