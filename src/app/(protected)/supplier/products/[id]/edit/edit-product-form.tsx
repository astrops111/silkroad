"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  ImageIcon,
  FileText,
  DollarSign,
  Trash2,
  Plus,
  Loader2,
  Save,
  Star,
  X,
  ExternalLink,
  Play,
  Pause,
} from "lucide-react";
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
import ImageUploader from "@/components/product/ImageUploader";
import DocumentUploader from "@/components/product/DocumentUploader";
import {
  updateProduct,
  addProductImages,
  removeProductImage,
  addProductDocuments,
  removeProductDocument,
  replacePricingTiers,
  deleteProduct,
  toggleProductActive,
} from "@/lib/actions/products";

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

interface ProductSnapshot {
  id: string;
  name: string;
  nameLocal: string | null;
  description: string | null;
  categoryId: string | null;
  basePrice: number;
  cogs: number | null;
  currency: string | null;
  moq: number | null;
  leadTimeDays: number | null;
  tradeTerm: string | null;
  originCountry: string | null;
  brand: string | null;
  sampleAvailable: boolean;
  samplePrice: number | null;
  weightKg: number | null;
  hsCode: string | null;
  janCode: string | null;
  shelfLifeDays: number | null;
  boxPackQty: number | null;
  shippingMode: string | null;
  legalCategory: string | null;
  skinHairType: string | null;
  targetAudience: string | null;
  scent: string | null;
  texture: string | null;
  usageInstructions: string | null;
  storageInstructions: string | null;
  warnings: string | null;
  isActive: boolean;
  moderationStatus: string | null;
}

interface ExistingImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface ExistingDoc {
  id: string;
  url: string;
  certType: string;
  certNumber: string | null;
  validUntil: string | null;
}

interface TierRow {
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
}

interface NewDoc {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  certType: string;
  certNumber: string;
  validUntil: string;
}

interface Props {
  product: ProductSnapshot;
  images: ExistingImage[];
  docs: ExistingDoc[];
  tiers: { minQuantity: number; maxQuantity: number | null; unitPrice: number }[];
  categories: { id: string; name: string; level: number; parentId: string | null }[];
  supplierCompanyId: string;
}

export default function EditProductForm({
  product,
  images: initialImages,
  docs: initialDocs,
  tiers: initialTiers,
  categories,
  supplierCompanyId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savingField, setSavingField] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: product.name,
    nameLocal: product.nameLocal ?? "",
    brand: product.brand ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    basePrice: (product.basePrice / 100).toString(),
    cogs: product.cogs != null ? (product.cogs / 100).toString() : "",
    currency: product.currency ?? "USD",
    moq: (product.moq ?? 1).toString(),
    leadTimeDays: product.leadTimeDays?.toString() ?? "",
    tradeTerm: product.tradeTerm ?? "fob",
    originCountry: product.originCountry ?? "",
    sampleAvailable: product.sampleAvailable,
    samplePrice:
      product.samplePrice != null ? (product.samplePrice / 100).toString() : "",
    weightKg: product.weightKg?.toString() ?? "",
    hsCode: product.hsCode ?? "",
    janCode: product.janCode ?? "",
    shelfLifeDays: product.shelfLifeDays?.toString() ?? "",
    boxPackQty: product.boxPackQty?.toString() ?? "",
    shippingMode: product.shippingMode ?? "",
    legalCategory: product.legalCategory ?? "",
    skinHairType: product.skinHairType ?? "",
    targetAudience: product.targetAudience ?? "",
    scent: product.scent ?? "",
    texture: product.texture ?? "",
    usageInstructions: product.usageInstructions ?? "",
    storageInstructions: product.storageInstructions ?? "",
    warnings: product.warnings ?? "",
  });

  const [isActive, setIsActive] = useState(product.isActive);
  const [togglingActive, setTogglingActive] = useState(false);

  const [images, setImages] = useState<ExistingImage[]>(initialImages);
  const [docs, setDocs] = useState<ExistingDoc[]>(initialDocs);
  const [newDocs, setNewDocs] = useState<NewDoc[]>([]);

  const [tiers, setTiers] = useState<TierRow[]>(() =>
    initialTiers.length
      ? initialTiers.map((t) => ({
          minQuantity: t.minQuantity.toString(),
          maxQuantity: t.maxQuantity?.toString() ?? "",
          unitPrice: (t.unitPrice / 100).toString(),
        }))
      : [{ minQuantity: "", maxQuantity: "", unitPrice: "" }]
  );

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTier(i: number, field: keyof TierRow, value: string) {
    setTiers((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))
    );
  }

  function saveBasics() {
    setSavingField("basics");
    startTransition(async () => {
      const res = await updateProduct(product.id, {
        name: form.name,
        nameLocal: form.nameLocal || undefined,
        brand: form.brand || undefined,
        description: form.description,
        categoryId: form.categoryId,
        basePrice: parseFloat(form.basePrice) || 0,
        cogs: form.cogs ? parseFloat(form.cogs) : undefined,
        currency: form.currency,
        moq: parseInt(form.moq) || 1,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
        tradeTerm: form.tradeTerm as
          | "fob"
          | "cif"
          | "exw"
          | "ddp"
          | "dap"
          | "cpt"
          | "fca",
        originCountry: form.originCountry || undefined,
        sampleAvailable: form.sampleAvailable,
        samplePrice: form.samplePrice ? parseFloat(form.samplePrice) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        hsCode: form.hsCode || undefined,
        janCode: form.janCode || undefined,
        shelfLifeDays: form.shelfLifeDays ? parseInt(form.shelfLifeDays) : undefined,
        boxPackQty: form.boxPackQty ? parseInt(form.boxPackQty) : undefined,
        shippingMode: form.shippingMode
          ? (form.shippingMode as "air" | "sea" | "either")
          : undefined,
        legalCategory: form.legalCategory || undefined,
        skinHairType: form.skinHairType || undefined,
        targetAudience: form.targetAudience || undefined,
        scent: form.scent || undefined,
        texture: form.texture || undefined,
        usageInstructions: form.usageInstructions || undefined,
        storageInstructions: form.storageInstructions || undefined,
        warnings: form.warnings || undefined,
      });
      setSavingField(null);
      if (!res.success) toast.error(res.error ?? "Failed to save");
      else toast.success("Saved");
    });
  }

  function handleToggleActive() {
    const next = !isActive;
    setTogglingActive(true);
    startTransition(async () => {
      const res = await toggleProductActive(product.id, next);
      setTogglingActive(false);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update status");
      } else {
        setIsActive(next);
        toast.success(next ? "Listing is live" : "Listing paused");
      }
    });
  }

  function savePricing() {
    setSavingField("pricing");
    startTransition(async () => {
      const valid = tiers
        .filter((t) => t.minQuantity && t.unitPrice)
        .map((t) => ({
          minQuantity: parseInt(t.minQuantity),
          maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity) : undefined,
          unitPrice: parseFloat(t.unitPrice),
          currency: form.currency,
        }));
      const res = await replacePricingTiers(product.id, valid);
      setSavingField(null);
      if (!res.success) toast.error(res.error ?? "Failed to save tiers");
      else toast.success("Pricing tiers updated");
    });
  }

  function handleRemoveImage(imageId: string) {
    startTransition(async () => {
      const res = await removeProductImage(product.id, imageId);
      if (!res.success) toast.error(res.error ?? "Failed to remove");
      else {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success("Image removed");
      }
    });
  }

  function handleNewImage(uploaded: { url: string; fileName: string }) {
    startTransition(async () => {
      const res = await addProductImages(product.id, [
        { url: uploaded.url, altText: uploaded.fileName, isPrimary: images.length === 0 },
      ]);
      if (!res.success) {
        toast.error(res.error ?? "Failed to save image");
        return;
      }
      setImages((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          url: uploaded.url,
          altText: uploaded.fileName,
          isPrimary: prev.length === 0,
          sortOrder: prev.length,
        },
      ]);
      router.refresh();
    });
  }

  function handleRemoveDoc(certId: string) {
    startTransition(async () => {
      const res = await removeProductDocument(product.id, certId);
      if (!res.success) toast.error(res.error ?? "Failed to remove");
      else {
        setDocs((prev) => prev.filter((d) => d.id !== certId));
        toast.success("Document removed");
      }
    });
  }

  function saveNewDocs() {
    if (newDocs.length === 0) return;
    setSavingField("docs");
    startTransition(async () => {
      const res = await addProductDocuments(
        product.id,
        newDocs.map((d) => ({
          url: d.url,
          certType: d.certType || "other",
          certNumber: d.certNumber || undefined,
          validUntil: d.validUntil || undefined,
        }))
      );
      setSavingField(null);
      if (!res.success) {
        toast.error(res.error ?? "Failed to save documents");
        return;
      }
      toast.success(
        `${newDocs.length} document${newDocs.length === 1 ? "" : "s"} saved`
      );
      setNewDocs([]);
      router.refresh();
    });
  }

  function handleDeleteProduct() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(product.id);
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Product deleted");
        router.push("/supplier/products");
      }
    });
  }

  const statusVariant =
    product.moderationStatus === "approved"
      ? "default"
      : product.moderationStatus === "rejected"
        ? "destructive"
        : "secondary";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/products"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-2xl font-bold text-[var(--obsidian)] truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {form.name || "Edit Product"}
            </h1>
            <Badge variant={statusVariant}>
              {product.moderationStatus ?? "pending"}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Changes are saved per section.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleToggleActive}
          disabled={togglingActive}
          className={
            isActive
              ? "text-[var(--text-secondary)]"
              : "text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/5"
          }
          title={
            isActive
              ? "Listing is live — click to pause"
              : "Listing is paused — click to go live"
          }
        >
          {togglingActive ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isActive ? "Live" : "Paused"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDeleteProduct}
          disabled={pending}
          className="text-[var(--danger)]"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      {/* BASICS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--amber)]" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Product name, description, category, and pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => updateField("brand", e.target.value)}
                placeholder="e.g. Acme"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameLocal">Name (local language)</Label>
            <Input
              id="nameLocal"
              value={form.nameLocal}
              onChange={(e) => updateField("nameLocal", e.target.value)}
              placeholder="e.g. 乳木果油"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => updateField("categoryId", v)}
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
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>COGS *</Label>
              <div className="flex gap-2">
                <Select
                  value={form.currency}
                  onValueChange={(v) => updateField("currency", v)}
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
                  onChange={(e) => updateField("cogs", e.target.value)}
                  className="flex-1"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Your internal cost. Not shown to buyers.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Listed Price</Label>
              <div className="h-9 px-3 flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--text-primary)]">
                {form.cogs && parseFloat(form.cogs) > 0
                  ? (parseFloat(form.cogs) * 1.4).toFixed(2)
                  : parseFloat(form.basePrice || "0").toFixed(2)}
                <span className="ml-1 text-xs text-[var(--text-tertiary)] font-normal">
                  {form.currency}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Auto: COGS × 1.4
              </p>
            </div>

            <div className="space-y-2">
              <Label>MOQ *</Label>
              <Input
                type="number"
                value={form.moq}
                onChange={(e) => updateField("moq", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                value={form.leadTimeDays}
                onChange={(e) => updateField("leadTimeDays", e.target.value)}
              />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trade Term</Label>
              <Select
                value={form.tradeTerm}
                onValueChange={(v) => updateField("tradeTerm", v)}
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
            <div className="space-y-2">
              <Label>Origin Country (ISO-2)</Label>
              <Input
                value={form.originCountry}
                onChange={(e) =>
                  updateField("originCountry", e.target.value.toUpperCase())
                }
                placeholder="e.g. CN"
                maxLength={2}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sampleAvailable}
                onChange={(e) =>
                  updateField("sampleAvailable", e.target.checked)
                }
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--amber)] focus:ring-[var(--amber)]"
              />
              Samples available
            </label>
            {form.sampleAvailable && (
              <div className="pl-6 space-y-2 max-w-xs">
                <Label>Sample price ({form.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.samplePrice}
                  onChange={(e) => updateField("samplePrice", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.weightKg}
                onChange={(e) => updateField("weightKg", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>HS Code</Label>
              <Input
                value={form.hsCode}
                onChange={(e) => updateField("hsCode", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveBasics} disabled={pending}>
              {savingField === "basics" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PRODUCT DETAILS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--amber)]" />
            Product Details
          </CardTitle>
          <CardDescription>
            Optional attributes. Only filled-in fields appear on buyer pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Barcode / JAN code</Label>
              <Input
                value={form.janCode}
                onChange={(e) => updateField("janCode", e.target.value)}
                placeholder="e.g. 4901234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Legal category</Label>
              <Input
                value={form.legalCategory}
                onChange={(e) => updateField("legalCategory", e.target.value)}
                placeholder="e.g. cosmetic, food, OTC"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Shelf life (days)</Label>
              <Input
                type="number"
                value={form.shelfLifeDays}
                onChange={(e) => updateField("shelfLifeDays", e.target.value)}
                placeholder="e.g. 730"
              />
            </div>
            <div className="space-y-2">
              <Label>Units per box</Label>
              <Input
                type="number"
                value={form.boxPackQty}
                onChange={(e) => updateField("boxPackQty", e.target.value)}
                placeholder="e.g. 24"
              />
            </div>
            <div className="space-y-2">
              <Label>Shipping mode</Label>
              <Select
                value={form.shippingMode || "none"}
                onValueChange={(v) =>
                  updateField("shippingMode", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="sea">Sea</SelectItem>
                  <SelectItem value="either">Air or Sea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target audience</Label>
              <Input
                value={form.targetAudience}
                onChange={(e) => updateField("targetAudience", e.target.value)}
                placeholder="e.g. adults, babies, all ages"
              />
            </div>
            <div className="space-y-2">
              <Label>Skin / hair type</Label>
              <Input
                value={form.skinHairType}
                onChange={(e) => updateField("skinHairType", e.target.value)}
                placeholder="e.g. dry, oily, curly"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scent</Label>
              <Input
                value={form.scent}
                onChange={(e) => updateField("scent", e.target.value)}
                placeholder="e.g. fragrance-free, lavender"
              />
            </div>
            <div className="space-y-2">
              <Label>Texture / form</Label>
              <Input
                value={form.texture}
                onChange={(e) => updateField("texture", e.target.value)}
                placeholder="e.g. cream, gel, powder"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Usage instructions</Label>
            <textarea
              value={form.usageInstructions}
              onChange={(e) => updateField("usageInstructions", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
            />
          </div>

          <div className="space-y-2">
            <Label>Storage & handling</Label>
            <textarea
              value={form.storageInstructions}
              onChange={(e) => updateField("storageInstructions", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
            />
          </div>

          <div className="space-y-2">
            <Label>Warnings / cautions</Label>
            <textarea
              value={form.warnings}
              onChange={(e) => updateField("warnings", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveBasics} disabled={pending}>
              {savingField === "basics" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PRICING TIERS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--amber)]" />
            Volume Pricing
          </CardTitle>
          <CardDescription>
            Tiered pricing applied when buyers order above thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="flex items-end gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
            >
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Min Qty</Label>
                <Input
                  type="number"
                  value={tier.minQuantity}
                  onChange={(e) => updateTier(i, "minQuantity", e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Max Qty</Label>
                <Input
                  type="number"
                  value={tier.maxQuantity}
                  onChange={(e) => updateTier(i, "maxQuantity", e.target.value)}
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
                  onChange={(e) => updateTier(i, "unitPrice", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setTiers((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-[var(--danger)] shrink-0"
                disabled={tiers.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              onClick={() =>
                setTiers((prev) => [
                  ...prev,
                  { minQuantity: "", maxQuantity: "", unitPrice: "" },
                ])
              }
            >
              <Plus className="w-4 h-4" />
              Add tier
            </Button>
            <Button onClick={savePricing} disabled={pending}>
              {savingField === "pricing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save tiers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* IMAGES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[var(--amber)]" />
            Product Images
          </CardTitle>
          <CardDescription>
            {images.length} existing image{images.length === 1 ? "" : "s"} · first image is the primary thumbnail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface-secondary)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText ?? ""}
                    className="w-full h-full object-cover"
                  />
                  {img.isPrimary && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--amber)]/90 text-[var(--obsidian)] text-[10px] font-semibold">
                      <Star className="w-3 h-3" />
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    disabled={pending}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--danger)]"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Add more images
            </p>
            <ImageUploader
              bucket="products"
              folder={`supplier-${supplierCompanyId}/`}
              maxFiles={10 - images.length}
              onUpload={handleNewImage}
            />
          </div>
        </CardContent>
      </Card>

      {/* DOCUMENTS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--amber)]" />
            Documents & Certifications
          </CardTitle>
          <CardDescription>
            Spec sheets, certificates, safety data. Admins review these for verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {docs.length > 0 && (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 bg-[var(--surface-secondary)]"
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-md shrink-0"
                    style={{ background: "var(--surface-tertiary)" }}
                  >
                    <FileText
                      className="size-4"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {CERT_TYPES.find((t) => t.value === d.certType)?.label ??
                          d.certType}
                      </Badge>
                      {d.certNumber && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          #{d.certNumber}
                        </span>
                      )}
                      {d.validUntil && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          valid until {d.validUntil}
                        </span>
                      )}
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--amber-dark)] hover:underline mt-0.5"
                    >
                      View document
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(d.id)}
                    disabled={pending}
                    className="p-1.5 rounded-md hover:bg-[var(--surface-tertiary)]"
                    aria-label="Remove document"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-2">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Add more documents
            </p>
            <DocumentUploader
              folder={`supplier-${supplierCompanyId}/`}
              maxFiles={10}
              onUpload={(doc) =>
                setNewDocs((prev) => [
                  ...prev,
                  {
                    url: doc.url,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    certType: "spec-sheet",
                    certNumber: "",
                    validUntil: "",
                  },
                ])
              }
            />

            {newDocs.length > 0 && (
              <div className="space-y-3 mt-3">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Tag each pending document
                </p>
                {newDocs.map((d, i) => (
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
                        setNewDocs((prev) =>
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
                        setNewDocs((prev) =>
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
                        setNewDocs((prev) =>
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
                <div className="flex justify-end">
                  <Button onClick={saveNewDocs} disabled={pending}>
                    {savingField === "docs" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save {newDocs.length} document{newDocs.length === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
