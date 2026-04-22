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
  ImageIcon,
  FileText,
  X,
} from "lucide-react";
import {
  createProduct,
  addPricingTiers,
  addProductImages,
  addProductDocuments,
} from "@/lib/actions/products";
import { toast } from "sonner";
import ImageUploader, { type UploadedFile } from "@/components/product/ImageUploader";
import DocumentUploader, {
  type UploadedDoc,
} from "@/components/product/DocumentUploader";

const TRADE_TERMS = [
  { value: "fob", label: "FOB (Free on Board)" },
  { value: "cif", label: "CIF (Cost, Insurance & Freight)" },
  { value: "exw", label: "EXW (Ex Works)" },
  { value: "ddp", label: "DDP (Delivered Duty Paid)" },
  { value: "dap", label: "DAP (Delivered at Place)" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "KES", "GHS", "NGN", "ZAR"];

const CERT_TYPES = [
  { value: "spec-sheet", label: "Spec sheet / datasheet" },
  { value: "iso", label: "ISO certification" },
  { value: "ce", label: "CE marking" },
  { value: "fda", label: "FDA approval" },
  { value: "sgs", label: "SGS report" },
  { value: "origin", label: "Certificate of origin" },
  { value: "msds", label: "MSDS / safety data" },
  { value: "other", label: "Other" },
];

type Step = 1 | 2 | 3 | 4 | 5;

interface PricingTier {
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
}

interface StagedDoc extends UploadedDoc {
  certType: string;
  certNumber: string;
  validUntil: string;
}

interface CategoryOption {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}

interface Props {
  categories: CategoryOption[];
  supplierCompanyId: string;
}

export default function NewProductForm({ categories, supplierCompanyId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    description: "",
    categoryId: "",
    basePrice: "",
    cogs: "",
    currency: "USD",
    moq: "1",
    leadTimeDays: "",
    tradeTerm: "fob",
    originCountry: "",
  });

  const [tiers, setTiers] = useState<PricingTier[]>([
    { minQuantity: "10", maxQuantity: "49", unitPrice: "" },
    { minQuantity: "50", maxQuantity: "99", unitPrice: "" },
    { minQuantity: "100", maxQuantity: "", unitPrice: "" },
  ]);

  const [extras, setExtras] = useState({
    sampleAvailable: false,
    samplePrice: "",
    weightKg: "",
    hsCode: "",
  });

  const [images, setImages] = useState<UploadedFile[]>([]);
  const [docs, setDocs] = useState<StagedDoc[]>([]);

  function updateForm(field: keyof typeof form, value: string) {
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

  function canAdvance(): boolean {
    if (step === 1) {
      return (
        form.name.trim().length >= 3 &&
        form.description.trim().length >= 10 &&
        !!form.categoryId &&
        !!form.cogs &&
        parseFloat(form.cogs) > 0 &&
        !!form.moq
      );
    }
    return true;
  }

  const cogsValue = parseFloat(form.cogs || "0");
  const listedPrice = cogsValue > 0 ? cogsValue * 1.4 : parseFloat(form.basePrice || "0");

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await createProduct({
        name: form.name,
        brand: form.brand || undefined,
        description: form.description,
        categoryId: form.categoryId,
        // base_price is derived server-side from COGS × 1.4. Fallback for legacy manual entry.
        basePrice: listedPrice || 0,
        cogs: form.cogs ? parseFloat(form.cogs) : undefined,
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

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to create product");
        setLoading(false);
        return;
      }

      const productId = result.data.id;

      const validTiers = tiers.filter((t) => t.minQuantity && t.unitPrice);
      if (validTiers.length) {
        await addPricingTiers(
          productId,
          validTiers.map((t) => ({
            minQuantity: parseInt(t.minQuantity),
            maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity) : undefined,
            unitPrice: parseFloat(t.unitPrice),
            currency: form.currency,
          }))
        );
      }

      if (images.length) {
        await addProductImages(
          productId,
          images.map((img, i) => ({
            url: img.url,
            altText: img.fileName,
            isPrimary: i === 0,
          }))
        );
      }

      if (docs.length) {
        const validDocs = docs.filter((d) => d.url);
        if (validDocs.length) {
          await addProductDocuments(
            productId,
            validDocs.map((d) => ({
              url: d.url,
              certType: d.certType || "other",
              certNumber: d.certNumber || undefined,
              validUntil: d.validUntil || undefined,
            }))
          );
        }
      }

      toast.success("Product submitted for review");
      router.push("/supplier/products");
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  const uploadFolder = `supplier-${supplierCompanyId}/`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
            Step {step} of 5 —{" "}
            {step === 1
              ? "Basic Information"
              : step === 2
                ? "Pricing Tiers"
                : step === 3
                  ? "Samples & Shipping"
                  : step === 4
                    ? "Product Images"
                    : "Documents & Certifications"}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              s <= step ? "bg-[var(--amber)]" : "bg-[var(--border-default)]"
            }`}
          />
        ))}
      </div>

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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => updateForm("brand", e.target.value)}
                  placeholder="e.g. Acme"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Describe your product — quality, use cases, packaging…"
                rows={4}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              {categories.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">
                  No categories available yet. Ask an admin to set up the taxonomy.
                </p>
              ) : (
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => updateForm("categoryId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {"— ".repeat(c.level)}
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>COGS *</Label>
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
                    value={form.cogs}
                    onChange={(e) => updateForm("cogs", e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Your cost. Not shown to buyers.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Listed Price</Label>
                <div className="h-9 px-3 flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--text-primary)]">
                  {listedPrice.toFixed(2)}
                  <span className="ml-1 text-xs text-[var(--text-tertiary)] font-normal">
                    {form.currency}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Auto: COGS × 1.4
                </p>
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

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[var(--amber)]" />
              Product Images
            </CardTitle>
            <CardDescription>
              Add up to 10 images. The first image will be used as the primary thumbnail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div
                    key={img.url}
                    className="group relative aspect-square rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface-secondary)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[var(--amber)]/90 text-[var(--obsidian)] text-[10px] font-semibold">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((x) => x.url !== img.url))
                      }
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--danger)]"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ImageUploader
              bucket="products"
              folder={uploadFolder}
              maxFiles={10}
              onUpload={(file) =>
                setImages((prev) => [...prev, file])
              }
            />
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--amber)]" />
              Documents & Certifications
            </CardTitle>
            <CardDescription>
              Upload spec sheets, certificates, safety data, or compliance documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader
              folder={uploadFolder}
              maxFiles={10}
              onUpload={(doc) =>
                setDocs((prev) => [
                  ...prev,
                  {
                    ...doc,
                    certType: "spec-sheet",
                    certNumber: "",
                    validUntil: "",
                  },
                ])
              }
            />

            {docs.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Tag each document (optional)
                </p>
                {docs.map((d, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-subtle)] p-3"
                  >
                    <div className="col-span-3 text-xs text-[var(--text-tertiary)] truncate">
                      {d.fileName}
                    </div>
                    <Select
                      value={d.certType}
                      onValueChange={(v) =>
                        setDocs((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, certType: v } : x
                          )
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CERT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Cert number"
                      value={d.certNumber}
                      onChange={(e) =>
                        setDocs((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? { ...x, certNumber: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                    <Input
                      type="date"
                      value={d.validUntil}
                      onChange={(e) =>
                        setDocs((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? { ...x, validUntil: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s - 1) as Step)}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 5 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canAdvance()}
          >
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
