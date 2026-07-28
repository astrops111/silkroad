"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Gem, Loader2, Save } from "lucide-react";
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
import { createResourceListing } from "@/lib/actions/resources-listing";
import { ONBOARDING_COUNTRIES } from "@/lib/constants/regions";
import ImageUploader, { type UploadedFile } from "@/components/product/ImageUploader";
import type { ResourceCategory } from "@/lib/queries/resources";

const TRADE_TERMS = [
  { value: "fob", label: "FOB (Free on Board)" },
  { value: "cif", label: "CIF (Cost, Insurance & Freight)" },
  { value: "exw", label: "EXW (Ex Works)" },
  { value: "ddp", label: "DDP (Delivered Duty Paid)" },
  { value: "dap", label: "DAP (Delivered at Place)" },
  { value: "cpt", label: "CPT (Carriage Paid To)" },
  { value: "fca", label: "FCA (Free Carrier)" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "KES", "GHS", "NGN", "ZAR"];

interface Props {
  categories: ResourceCategory[];
  supplierCompanyId: string;
}

export default function NewResourceListingForm({ categories, supplierCompanyId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nameEn: "",
    resourceCategoryId: "",
    originCountry: "",
    grade: "",
    variety: "",
    unitOfMeasure: "",
    incoterm: "fob",
    portOfLoading: "",
    portOfDischarge: "",
    availableQuantity: "",
    minOrderQuantity: "",
    pricePerUnitUsd: "",
    currency: "USD",
    leadTimeDays: "",
  });

  const [images, setImages] = useState<UploadedFile[]>([]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.resourceCategoryId),
    [categories, form.resourceCategoryId]
  );

  const needsCompliance =
    !!selectedCategory &&
    (selectedCategory.requires_kimberley ||
      selectedCategory.requires_oecd_3tg ||
      selectedCategory.requires_cites ||
      selectedCategory.requires_gacc);

  const [complianceRefs, setComplianceRefs] = useState({
    kimberleyCertRef: "",
    oecd3tgDueDiligenceRef: "",
    citesPermitRef: "",
    gaccRegistrationRef: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleCategoryChange(id: string) {
    const category = categories.find((c) => c.id === id);
    setForm((prev) => ({
      ...prev,
      resourceCategoryId: id,
      unitOfMeasure: category?.unit_of_measure ?? prev.unitOfMeasure,
    }));
  }

  const isValid =
    form.nameEn.length >= 3 &&
    !!form.resourceCategoryId &&
    form.originCountry.length === 2 &&
    !!form.unitOfMeasure &&
    parseFloat(form.availableQuantity) > 0 &&
    parseFloat(form.pricePerUnitUsd) > 0;

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await createResourceListing({
        nameEn: form.nameEn,
        resourceCategoryId: form.resourceCategoryId,
        originCountry: form.originCountry,
        grade: form.grade || undefined,
        variety: form.variety || undefined,
        unitOfMeasure: form.unitOfMeasure,
        incoterm: form.incoterm as "fob" | "cif" | "exw" | "ddp" | "dap" | "cpt" | "fca",
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        availableQuantity: parseFloat(form.availableQuantity),
        minOrderQuantity: form.minOrderQuantity ? parseFloat(form.minOrderQuantity) : undefined,
        pricePerUnitUsd: parseFloat(form.pricePerUnitUsd),
        currency: form.currency,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
        images: images.map((img) => img.url),
        kimberleyCertRef: complianceRefs.kimberleyCertRef || undefined,
        oecd3tgDueDiligenceRef: complianceRefs.oecd3tgDueDiligenceRef || undefined,
        citesPermitRef: complianceRefs.citesPermitRef || undefined,
        gaccRegistrationRef: complianceRefs.gaccRegistrationRef || undefined,
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to create listing");
        setLoading(false);
        return;
      }

      toast.success("Listing submitted for review");
      router.push("/supplier/resources");
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  const uploadFolder = `supplier-${supplierCompanyId}/resources/`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/resources"
          className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            New resource listing
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            List a raw commodity or resource for buyers around the world to browse and quote.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gem className="w-4 h-4 text-[var(--amber)]" />
            Listing details
          </CardTitle>
          <CardDescription>
            This will be submitted for admin review before it appears to buyers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Listing name *</Label>
            <Input
              value={form.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
              placeholder="e.g. Premium Arabica Coffee — Washed Process"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.resourceCategoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.group_code} · {c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origin country *</Label>
              <Select value={form.originCountry} onValueChange={(v) => set("originCountry", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {ONBOARDING_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Grade (optional)</Label>
              <Input value={form.grade} onChange={(e) => set("grade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Variety (optional)</Label>
              <Input value={form.variety} onChange={(e) => set("variety", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quantity, price & terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Unit of measure *</Label>
              <Input
                value={form.unitOfMeasure}
                onChange={(e) => set("unitOfMeasure", e.target.value)}
                placeholder="e.g. MT, kg, m3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Available quantity *</Label>
              <Input
                type="number"
                min="0"
                value={form.availableQuantity}
                onChange={(e) => set("availableQuantity", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min. order quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.minOrderQuantity}
                onChange={(e) => set("minOrderQuantity", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price per unit (USD) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerUnitUsd}
                onChange={(e) => set("pricePerUnitUsd", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Lead time (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(e) => set("leadTimeDays", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Incoterm</Label>
              <Select value={form.incoterm} onValueChange={(v) => set("incoterm", v)}>
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
            <div className="space-y-1.5">
              <Label>Port of loading</Label>
              <Input
                value={form.portOfLoading}
                onChange={(e) => set("portOfLoading", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Port of discharge</Label>
              <Input
                value={form.portOfDischarge}
                onChange={(e) => set("portOfDischarge", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {needsCompliance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance references</CardTitle>
            <CardDescription>
              Required for this category before an admin can approve the listing — you can add
              these later from your listing if you don't have them yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCategory?.requires_kimberley && (
              <div className="space-y-1.5">
                <Label>Kimberley Process certificate ref</Label>
                <Input
                  value={complianceRefs.kimberleyCertRef}
                  onChange={(e) =>
                    setComplianceRefs((p) => ({ ...p, kimberleyCertRef: e.target.value }))
                  }
                />
              </div>
            )}
            {selectedCategory?.requires_oecd_3tg && (
              <div className="space-y-1.5">
                <Label>OECD 3TG due-diligence ref</Label>
                <Input
                  value={complianceRefs.oecd3tgDueDiligenceRef}
                  onChange={(e) =>
                    setComplianceRefs((p) => ({ ...p, oecd3tgDueDiligenceRef: e.target.value }))
                  }
                />
              </div>
            )}
            {selectedCategory?.requires_cites && (
              <div className="space-y-1.5">
                <Label>CITES permit ref</Label>
                <Input
                  value={complianceRefs.citesPermitRef}
                  onChange={(e) =>
                    setComplianceRefs((p) => ({ ...p, citesPermitRef: e.target.value }))
                  }
                />
              </div>
            )}
            {selectedCategory?.requires_gacc && (
              <div className="space-y-1.5">
                <Label>GACC registration ref</Label>
                <Input
                  value={complianceRefs.gaccRegistrationRef}
                  onChange={(e) =>
                    setComplianceRefs((p) => ({ ...p, gaccRegistrationRef: e.target.value }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            bucket="products"
            folder={uploadFolder}
            maxFiles={10}
            onUpload={(file) => setImages((prev) => [...prev, file])}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-[var(--text-tertiary)]">
          By submitting you confirm you have the right to sell this resource.
        </p>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? "Creating..." : "Create listing"}
        </Button>
      </div>
    </div>
  );
}
