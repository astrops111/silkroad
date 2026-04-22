"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ShoppingCart, Factory, Loader2 } from "lucide-react";
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

export default function AddRolePage() {
  return (
    <Suspense>
      <AddRoleForm />
    </Suspense>
  );
}

function AddRoleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const companyType: "buyer_org" | "supplier" =
    typeParam === "supplier" ? "supplier" : "buyer_org";
  const roleLabel = companyType === "supplier" ? "Supplier" : "Buyer";
  const Icon = companyType === "supplier" ? Factory : ShoppingCart;
  const postRedirect = companyType === "supplier" ? "/supplier/dashboard" : "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
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

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

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
          type: companyType,
          country_code: form.countryCode,
          market_region: form.marketRegion,
          industry: form.industry || null,
          city: form.city || null,
        })
        .select()
        .single();
      if (companyError) throw companyError;

      // New membership is NOT primary — the user's existing primary stays put.
      const role = companyType === "supplier" ? "supplier_owner" : "buyer";
      const { error: memberError } = await supabase
        .from("company_members")
        .insert({
          company_id: company.id,
          user_id: profile.id,
          role,
          is_primary: false,
        });
      if (memberError) throw memberError;

      if (companyType === "supplier") {
        await supabase.from("supplier_profiles").insert({
          company_id: company.id,
          factory_country: form.countryCode,
        });
      }

      router.push(postRedirect);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const isValid = form.companyName.length >= 2 && form.countryCode.length === 2;

  return (
    <Card className="border-[var(--border-subtle)] shadow-lg">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--amber-glow)] flex items-center justify-center mx-auto mb-2">
          <Icon className="size-6 text-[var(--amber-dark)]" />
        </div>
        <CardTitle className="text-xl">Add your {roleLabel} profile</CardTitle>
        <CardDescription>
          Tell us about your {roleLabel.toLowerCase()} business — this gets
          added to your existing account.
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
              <Icon className="size-4" />
            )}
            {loading ? "Creating profile..." : `Create ${roleLabel} profile`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
