"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "@/lib/actions/auth";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Loader2, ShoppingCart, Factory, Shield } from "lucide-react";

type PortalKey = "buyer" | "supplier" | "admin";
const PORTAL_REDIRECT: Record<PortalKey, string> = {
  buyer: "/dashboard",
  supplier: "/supplier/dashboard",
  admin: "/admin/dashboard",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<PortalKey>("buyer");

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const result = await signIn(formData);

    if (!result.success) {
      setError(result.error ?? "Login failed");
      setLoading(false);
      return;
    }

    // Hard-navigate so the new session cookies take effect on the next request.
    window.location.href = PORTAL_REDIRECT[portal];
  }

  return (
    <Card className="border-[var(--border-subtle)] shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("welcomeBack")}</CardTitle>
        <CardDescription>{t("signInToAccount")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={portal}
          onValueChange={(v) => setPortal(v as PortalKey)}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buyer" className="gap-2">
              <ShoppingCart className="size-4" />
              Buyer
            </TabsTrigger>
            <TabsTrigger value="supplier" className="gap-2">
              <Factory className="size-4" />
              Supplier
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="size-4" />
              Admin
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[var(--amber-dark)] hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
          {t("noAccount")}{" "}
          <Link
            href="/auth/register"
            className="text-[var(--amber-dark)] font-medium hover:underline"
          >
            {t("createAccount")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
