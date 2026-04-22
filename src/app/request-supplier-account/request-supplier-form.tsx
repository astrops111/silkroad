"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Factory,
  Loader2,
  ArrowLeft,
  Send,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { submitSupplierApplication } from "@/lib/actions/supplier-applications";

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const YEARS_IN_BUSINESS = ["< 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

interface Category {
  slug: string;
  name: string;
}

interface Props {
  prefill: {
    fullName: string;
    email: string;
    phone: string;
  };
  categories: Category[];
  locale?: string;
}

export default function RequestSupplierForm({ prefill, categories, locale }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName: prefill.fullName,
    email: prefill.email,
    phone: prefill.phone,
    roleAtCompany: "",
    companyName: "",
    companyNameLocal: "",
    countryCode: "CN",
    city: "",
    website: "",
    yearsInBusiness: "",
    employeeRange: "",
    productsDescription: "",
    monthlyCapacity: "",
    existingMarkets: "",
    certifications: "",
    sampleAvailable: false,
  });
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [categoryOther, setCategoryOther] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleCat(slug: string) {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function addOtherCat() {
    const v = categoryOther.trim();
    if (!v) return;
    const tag = `other:${v}`;
    if (!selectedCats.includes(tag)) {
      setSelectedCats((prev) => [...prev, tag]);
    }
    setCategoryOther("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitSupplierApplication({
        ...form,
        productCategories: selectedCats,
        locale,
        sourcePath: "/request-supplier-account",
      });
      if (!res.success) {
        setError(res.error ?? "Failed to submit");
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="pt-[104px] lg:pt-[184px] bg-[var(--surface-secondary)] min-h-screen">
          <div className="max-w-xl mx-auto px-6 py-16">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-[var(--success)]/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                </div>
                <CardTitle className="mt-4">Application received</CardTitle>
                <CardDescription>
                  Thank you. Our team will review your request and get back to you at{" "}
                  <strong>{form.email}</strong> within 2 business days.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline">
                  <Link href="/">Return to marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[184px] bg-[var(--surface-secondary)] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-10 pb-24 space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </Link>
            <div>
              <h1
                className="text-2xl font-bold text-[var(--obsidian)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Request a supplier account
              </h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
                Tell us about your business and the products you want to sell. Our team will review and respond within 2 business days.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Factory className="w-4 h-4 text-[var(--amber)]" />
                Your contact details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Full name *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role at company</Label>
                  <Input
                    value={form.roleAtCompany}
                    onChange={(e) => set("roleAtCompany", e.target.value)}
                    placeholder="e.g. Sales manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Work email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (WhatsApp / WeChat)</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+86 138 0000 0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company</CardTitle>
              <CardDescription>
                We will verify these details before approving your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company name *</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Name (local language)</Label>
                  <Input
                    value={form.companyNameLocal}
                    onChange={(e) => set("companyNameLocal", e.target.value)}
                    placeholder="e.g. 广州永盛贸易有限公司"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Country (ISO-2)</Label>
                  <Input
                    value={form.countryCode}
                    onChange={(e) =>
                      set("countryCode", e.target.value.toUpperCase())
                    }
                    maxLength={2}
                    placeholder="CN"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Years in business</Label>
                  <Select
                    value={form.yearsInBusiness}
                    onValueChange={(v) => set("yearsInBusiness", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS_IN_BUSINESS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Employees</Label>
                  <Select
                    value={form.employeeRange}
                    onValueChange={(v) => set("employeeRange", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Products you want to sell *
              </CardTitle>
              <CardDescription>
                Pick all categories that apply and describe your products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const active = selectedCats.includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => toggleCat(c.slug)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                          active
                            ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                            : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <Input
                    value={categoryOther}
                    onChange={(e) => setCategoryOther(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOtherCat();
                      }
                    }}
                    placeholder="Another category or niche…"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOtherCat}
                    disabled={!categoryOther.trim()}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>

                {selectedCats.filter((s) => s.startsWith("other:")).length >
                  0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedCats
                      .filter((s) => s.startsWith("other:"))
                      .map((s) => (
                        <Badge key={s} variant="secondary" className="pr-1">
                          {s.replace(/^other:/, "")}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCats((prev) =>
                                prev.filter((x) => x !== s)
                              )
                            }
                            className="ml-1 rounded hover:bg-black/10 p-0.5"
                            aria-label="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Describe your products *</Label>
                <textarea
                  value={form.productsDescription}
                  onChange={(e) =>
                    set("productsDescription", e.target.value)
                  }
                  rows={4}
                  placeholder="What do you make or supply? Include product types, materials, brand names, unit sizes, packaging, MOQs, etc."
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)]"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Minimum 20 characters.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly production / export capacity</Label>
                  <Input
                    value={form.monthlyCapacity}
                    onChange={(e) => set("monthlyCapacity", e.target.value)}
                    placeholder="e.g. 20,000 units / 40 x 40ft containers"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Existing export markets</Label>
                  <Input
                    value={form.existingMarkets}
                    onChange={(e) => set("existingMarkets", e.target.value)}
                    placeholder="e.g. EU, UAE, Nigeria"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Certifications (ISO, CE, FDA, HACCP, …)</Label>
                <Input
                  value={form.certifications}
                  onChange={(e) => set("certifications", e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sampleAvailable}
                  onChange={(e) => set("sampleAvailable", e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--amber)] focus:ring-[var(--amber)]"
                />
                Samples available for buyer evaluation
              </label>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-[var(--text-tertiary)]">
              By submitting you agree to our review process.
            </p>
            <Button onClick={submit} disabled={pending}>
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit application
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
