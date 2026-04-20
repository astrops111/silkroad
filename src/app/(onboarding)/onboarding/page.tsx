"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const COUNTRIES = [
  { code: "GH", name: "Ghana", region: "africa_west" },
  { code: "NG", name: "Nigeria", region: "africa_west" },
  { code: "KE", name: "Kenya", region: "africa_east" },
  { code: "TZ", name: "Tanzania", region: "africa_east" },
  { code: "UG", name: "Uganda", region: "africa_east" },
  { code: "RW", name: "Rwanda", region: "africa_east" },
  { code: "ET", name: "Ethiopia", region: "africa_east" },
  { code: "ZA", name: "South Africa", region: "africa_south" },
  { code: "CM", name: "Cameroon", region: "africa_central" },
  { code: "CD", name: "DR Congo", region: "africa_central" },
  { code: "EG", name: "Egypt", region: "africa_north" },
  { code: "MA", name: "Morocco", region: "africa_north" },
  { code: "SN", name: "Senegal", region: "africa_west" },
  { code: "CI", name: "Ivory Coast", region: "africa_west" },
  { code: "CN", name: "China", region: "cn" },
];

const INDUSTRIES = [
  "Electronics & Technology",
  "Machinery & Equipment",
  "Textiles & Apparel",
  "Construction & Building Materials",
  "Agriculture & Food",
  "Minerals & Mining",
  "Chemicals & Pharmaceuticals",
  "Consumer Goods",
  "Automotive & Transport",
  "Energy & Solar",
  "Other",
];

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: "",
    type: "buyer_org" as "buyer_org" | "supplier",
    countryCode: "",
    marketRegion: "",
    industry: "",
    city: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCountryChange(code: string) {
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      setForm((prev) => ({
        ...prev,
        countryCode: country.code,
        marketRegion: country.region,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create company
      const slug =
        form.companyName
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/^-+|-+$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 8);

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: form.companyName,
          slug,
          type: form.type,
          country_code: form.countryCode,
          market_region: form.marketRegion,
          industry: form.industry || null,
          city: form.city || null,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create company membership
      const role =
        form.type === "supplier" ? "supplier_owner" : "buyer";

      await supabase.from("company_members").insert({
        company_id: company.id,
        user_id: profile.id,
        role,
        is_primary: true,
      });

      // If supplier, create supplier profile
      if (form.type === "supplier") {
        await supabase.from("supplier_profiles").insert({
          company_id: company.id,
          factory_country: form.countryCode,
        });
      }

      const redirectPath =
        form.type === "supplier" ? "/supplier" : "/dashboard";
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const isValid =
    form.companyName.length >= 2 && form.countryCode.length === 2;

  return (
    <Card className="border-[var(--border-subtle)] shadow-lg">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--amber-glow)] flex items-center justify-center mx-auto mb-2">
          <Building2 className="size-6 text-[var(--amber-dark)]" />
        </div>
        <CardTitle className="text-xl">Set up your company</CardTitle>
        <CardDescription>
          Tell us about your business to get started on SilkRoad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("type", "buyer_org")}
                className={`p-3 rounded-[var(--radius-md)] border text-sm font-medium transition-all ${
                  form.type === "buyer_org"
                    ? "border-[var(--amber)] bg-[var(--amber-glow)] text-[var(--amber-dark)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => updateField("type", "supplier")}
                className={`p-3 rounded-[var(--radius-md)] border text-sm font-medium transition-all ${
                  form.type === "supplier"
                    ? "border-[var(--amber)] bg-[var(--amber-glow)] text-[var(--amber-dark)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                Supplier
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="Your company or business name"
            />
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={form.countryCode}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City (optional)</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="e.g. Accra, Nairobi, Shenzhen"
            />
          </div>

          <div className="space-y-2">
            <Label>Industry (optional)</Label>
            <Select
              value={form.industry}
              onValueChange={(v) => updateField("industry", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Building2 className="size-4" />
            )}
            {loading ? "Setting up..." : "Complete setup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
