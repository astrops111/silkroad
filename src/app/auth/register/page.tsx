"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
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
import { UserPlus, Loader2, ArrowLeft, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

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
] as const;

type Step = 1 | 2 | 3;

function RegisterForm() {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultRole = searchParams.get("role") === "supplier" ? "supplier" : "buyer";

  const [formState, setFormState] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: defaultRole,
    companyName: "",
    countryCode: "",
    marketRegion: "",
  });

  function updateField(field: string, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handleCountryChange(code: string) {
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      setFormState((prev) => ({
        ...prev,
        countryCode: country.code,
        marketRegion: country.region,
      }));
    }
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return (
        formState.email.length > 3 &&
        formState.password.length >= 8 &&
        formState.password === formState.confirmPassword &&
        formState.fullName.length >= 2
      );
    }
    if (step === 2) {
      return formState.role.length > 0;
    }
    return (
      formState.companyName.length >= 2 && formState.countryCode.length === 2
    );
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const fd = new FormData();
    Object.entries(formState).forEach(([key, value]) => fd.append(key, value));

    const result = await signUp(fd);

    if (!result.success) {
      setError(result.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <Card className="border-[var(--border-subtle)] shadow-lg">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <UserPlus className="size-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            We&apos;ve sent a verification link to{" "}
            <strong>{formState.email}</strong>. Click the link to activate your
            account.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/auth/login")}
          >
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[var(--border-subtle)] shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Step {step} of 3 —{" "}
          {step === 1
            ? "Your details"
            : step === 2
              ? "Choose your role"
              : "Company info"}
        </CardDescription>
        <div className="flex gap-1.5 justify-center mt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step
                  ? "w-8 bg-[var(--amber)]"
                  : "w-8 bg-[var(--border-default)]"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={formState.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formState.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formState.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              How will you use SilkRoad Africa?
            </p>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => updateField("role", "buyer")}
                className={`p-4 rounded-[var(--radius-lg)] border text-left transition-all ${
                  formState.role === "buyer"
                    ? "border-[var(--amber)] bg-[var(--amber-glow)] ring-2 ring-[var(--amber)]/20"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="font-semibold text-sm">
                  I&apos;m a Buyer
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Source products from verified suppliers. Get bulk pricing, trade
                  assurance, and logistics support.
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateField("role", "supplier")}
                className={`p-4 rounded-[var(--radius-lg)] border text-left transition-all ${
                  formState.role === "supplier"
                    ? "border-[var(--amber)] bg-[var(--amber-glow)] ring-2 ring-[var(--amber)]/20"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="font-semibold text-sm">
                  I&apos;m a Supplier
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  List your products, reach African & Chinese buyers, and manage
                  orders with integrated payments.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Company */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={formState.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Your company or business name"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formState.countryCode}
                onValueChange={handleCountryChange}
              >
                <SelectTrigger className="w-full">
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
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex-1"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canAdvance()}
              className="flex-1"
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canAdvance() || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {loading ? "Creating account..." : "Create account"}
            </Button>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--amber-dark)] font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
