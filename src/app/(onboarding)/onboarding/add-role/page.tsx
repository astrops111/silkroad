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
import { addCompanyRole } from "@/lib/actions/onboarding";
import { ONBOARDING_COUNTRIES as COUNTRIES } from "@/lib/constants/regions";

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
      const result = await addCompanyRole({ ...form, type: companyType });
      if (!result.success) throw new Error(result.error);

      router.push(result.redirectPath);
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
