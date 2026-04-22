"use client";

import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Factory, Loader2, UserPlus, Check } from "lucide-react";
import { adminCreateUser, type CreateUserInput } from "@/lib/actions/admin-users";

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

type Role = "buyer" | "supplier";

export default function AdminCreateUserPage() {
  const [role, setRole] = useState<Role>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    role: Role;
  } | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    companyName: "",
    countryCode: "",
    marketRegion: "",
  });

  function updateField<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) {
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

  function generatePassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let p = "";
    for (let i = 0; i < 14; i++)
      p += chars[Math.floor(Math.random() * chars.length)];
    updateField("password", p);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const payload: CreateUserInput = { ...form, role };
    const result = await adminCreateUser(payload);

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed to create user");
      return;
    }

    setSuccess({ email: form.email, role });
    // Reset form for next entry but keep the tab.
    setForm({
      email: "",
      password: "",
      fullName: "",
      companyName: "",
      countryCode: "",
      marketRegion: "",
    });
  }

  const isValid =
    form.email.includes("@") &&
    form.password.length >= 8 &&
    form.fullName.length >= 2 &&
    form.companyName.length >= 2 &&
    form.countryCode.length === 2;

  const RoleIcon = role === "supplier" ? Factory : ShoppingCart;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create user</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Create a Buyer or Supplier account. The user will be registered in
          Supabase with a confirmed email — they can log in immediately.
        </p>
      </div>

      {success && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <Check className="size-4 mt-0.5" />
            <div>
              <div className="font-medium">Account created</div>
              <div className="mt-1 text-green-700">
                {success.email} ({success.role}) — they can now log in.
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="size-5" />
            New {role} account
          </CardTitle>
          <CardDescription>
            Select the role, then fill in the user and company details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buyer" className="gap-2">
                <ShoppingCart className="size-4" />
                Buyer
              </TabsTrigger>
              <TabsTrigger value="supplier" className="gap-2">
                <Factory className="size-4" />
                Supplier
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-[var(--amber-dark)] hover:underline"
                >
                  Generate
                </button>
              </div>
              <Input
                id="password"
                type="text"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                Share this password with the user securely. They can change it
                after first login.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">
                {role === "supplier" ? "Supplier company" : "Buyer company"}{" "}
                name
              </Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder={
                  role === "supplier"
                    ? "e.g. Shenzhen Silk Trading Co"
                    : "e.g. Accra Global Imports Ltd"
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={form.countryCode}
                onValueChange={handleCountryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
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

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RoleIcon className="size-4" />
              )}
              {loading
                ? "Creating..."
                : `Create ${role} account`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
