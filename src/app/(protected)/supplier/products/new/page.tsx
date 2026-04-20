"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Package,
  Save,
} from "lucide-react";
import { createProduct, addPricingTiers } from "@/lib/actions/products";
import { toast } from "sonner";

const TRADE_TERMS = [
  { value: "fob", label: "FOB (Free on Board)" },
  { value: "cif", label: "CIF (Cost, Insurance & Freight)" },
  { value: "exw", label: "EXW (Ex Works)" },
  { value: "ddp", label: "DDP (Delivered Duty Paid)" },
  { value: "dap", label: "DAP (Delivered at Place)" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "KES", "GHS", "NGN", "ZAR"];

type Step = 1 | 2 | 3;

interface PricingTier {
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic info
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    basePrice: "",
    currency: "USD",
    moq: "1",
    leadTimeDays: "",
    tradeTerm: "fob",
    originCountry: "",
  });

  // Step 2: Pricing tiers
  const [tiers, setTiers] = useState<PricingTier[]>([
    { minQuantity: "10", maxQuantity: "49", unitPrice: "" },
    { minQuantity: "50", maxQuantity: "99", unitPrice: "" },
    { minQuantity: "100", maxQuantity: "", unitPrice: "" },
  ]);

  // Step 3: Samples & shipping
  const [extras, setExtras] = useState({
    sampleAvailable: false,
    samplePrice: "",
    weightKg: "",
    hsCode: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTier(index: number, field: keyof PricingTier, value: string) {
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { minQuantity: "", maxQuantity: "", unitPrice: "" },
    ]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setLoading(true);

    try {
      // We need the supplier company ID — get it from the auth context
      // For now, we'll call the server action which handles this
      const result = await createProduct("current", {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || "11111111-0001-0000-0000-000000000000",
        basePrice: parseFloat(form.basePrice) || 0,
        currency: form.currency,
        moq: parseInt(form.moq) || 1,
        leadTimeDays: form.leadTimeDays
          ? parseInt(form.leadTimeDays)
          : undefined,
        tradeTerm: form.tradeTerm as
          | "fob"
          | "cif"
          | "exw"
          | "ddp"
          | "dap"
          | "cpt"
          | "fca",
        originCountry: form.originCountry || undefined,
        sampleAvailable: extras.sampleAvailable,
        samplePrice: extras.samplePrice
          ? parseFloat(extras.samplePrice)
          : undefined,
        weightKg: extras.weightKg ? parseFloat(extras.weightKg) : undefined,
        hsCode: extras.hsCode || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to create product");
        setLoading(false);
        return;
      }

      // Add pricing tiers
      const validTiers = tiers.filter(
        (t) => t.minQuantity && t.unitPrice
      );
      if (validTiers.length > 0 && result.data) {
        await addPricingTiers(
          result.data.id,
          validTiers.map((t) => ({
            minQuantity: parseInt(t.minQuantity),
            maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity) : undefined,
            unitPrice: parseFloat(t.unitPrice),
            currency: form.currency,
          }))
        );
      }

      toast.success("Product created successfully! It will be reviewed shortly.");
      router.push("/supplier/products");
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/products"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Add New Product
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Step {step} of 3 —{" "}
            {step === 1
              ? "Basic Information"
              : step === 2
                ? "Pricing Tiers"
                : "Samples & Shipping"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              s <= step ? "bg-[var(--amber)]" : "bg-[var(--border-default)]"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--amber)]" />
              Product Details
            </CardTitle>
            <CardDescription>
              Enter the basic information about your product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="e.g. Premium Shea Butter - Raw Unrefined"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Describe your product in detail — quality, uses, certifications..."
                rows={4}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price *</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.currency}
                    onValueChange={(v) => updateForm("currency", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.basePrice}
                    onChange={(e) => updateForm("basePrice", e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Order Qty *</Label>
                <Input
                  type="number"
                  value={form.moq}
                  onChange={(e) => updateForm("moq", e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input
                  type="number"
                  value={form.leadTimeDays}
                  onChange={(e) => updateForm("leadTimeDays", e.target.value)}
                  placeholder="e.g. 14"
                />
              </div>

              <div className="space-y-2">
                <Label>Trade Term</Label>
                <Select
                  value={form.tradeTerm}
                  onValueChange={(v) => updateForm("tradeTerm", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_TERMS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pricing Tiers */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Volume Pricing</CardTitle>
            <CardDescription>
              Set tiered pricing to offer discounts for larger orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-end gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
              >
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Min Qty</Label>
                  <Input
                    type="number"
                    value={tier.minQuantity}
                    onChange={(e) =>
                      updateTier(index, "minQuantity", e.target.value)
                    }
                    placeholder="10"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Max Qty</Label>
                  <Input
                    type="number"
                    value={tier.maxQuantity}
                    onChange={(e) =>
                      updateTier(index, "maxQuantity", e.target.value)
                    }
                    placeholder="No limit"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">
                    Unit Price ({form.currency})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tier.unitPrice}
                    onChange={(e) =>
                      updateTier(index, "unitPrice", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
                {tiers.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTier(index)}
                    className="text-[var(--danger)] shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addTier} className="w-full">
              <Plus className="w-4 h-4" />
              Add Pricing Tier
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Samples & Shipping */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Samples & Shipping</CardTitle>
            <CardDescription>
              Configure sample availability and shipping details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sampleAvailable"
                checked={extras.sampleAvailable}
                onChange={(e) =>
                  setExtras((prev) => ({
                    ...prev,
                    sampleAvailable: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--amber)] focus:ring-[var(--amber)]"
              />
              <Label htmlFor="sampleAvailable">
                Samples available for this product
              </Label>
            </div>

            {extras.sampleAvailable && (
              <div className="space-y-2 pl-7">
                <Label>Sample Price ({form.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extras.samplePrice}
                  onChange={(e) =>
                    setExtras((prev) => ({
                      ...prev,
                      samplePrice: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="max-w-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extras.weightKg}
                  onChange={(e) =>
                    setExtras((prev) => ({ ...prev, weightKg: e.target.value }))
                  }
                  placeholder="e.g. 2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>HS Code</Label>
                <Input
                  value={extras.hsCode}
                  onChange={(e) =>
                    setExtras((prev) => ({ ...prev, hsCode: e.target.value }))
                  }
                  placeholder="e.g. 1801.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <Button onClick={() => setStep((s) => (s + 1) as Step)}>
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? "Creating..." : "Create Product"}
          </Button>
        )}
      </div>
    </div>
  );
}
