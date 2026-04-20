"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  ImagePlus,
  X,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Tag,
  Package,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mediaType: string;
}

interface Translation {
  name: string;
  description: string;
  shortDescription: string;
  tags: string[];
}

interface GeneratedListing {
  name: string;
  description: string;
  shortDescription: string;
  specs: Record<string, string>;
  tags: string[];
  suggestedCategory: string;
  suggestedCategoryId: string | null;
  suggestedHsCode: string;
  suggestedTradeTerm: string;
  suggestedMoq: number;
  estimatedWeightKg: number | null;
  translations: Record<string, Translation>;
}

const LANGUAGES: Record<string, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  fr: { name: "French", flag: "🇫🇷" },
  "zh-CN": { name: "Chinese", flag: "🇨🇳" },
  sw: { name: "Swahili", flag: "🇰🇪" },
  ar: { name: "Arabic", flag: "🇸🇦" },
  ha: { name: "Hausa", flag: "🇳🇬" },
  yo: { name: "Yoruba", flag: "🇳🇬" },
  am: { name: "Amharic", flag: "🇪🇹" },
  zu: { name: "Zulu", flag: "🇿🇦" },
  pt: { name: "Portuguese", flag: "🇲🇿" },
  lg: { name: "Luganda", flag: "🇺🇬" },
  rw: { name: "Kinyarwanda", flag: "🇷🇼" },
};

const COUNTRIES = [
  { code: "CN", name: "China" },
  { code: "KE", name: "Kenya" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" },
  { code: "ET", name: "Ethiopia" },
  { code: "RW", name: "Rwanda" },
  { code: "SN", name: "Senegal" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "CI", name: "Ivory Coast" },
];

const TRADE_TERM_LABELS: Record<string, string> = {
  fob: "FOB (Free on Board)",
  cif: "CIF (Cost, Insurance & Freight)",
  exw: "EXW (Ex Works)",
  ddp: "DDP (Delivered Duty Paid)",
  dap: "DAP (Delivered at Place)",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // Strip data:... prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-tertiary)]"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
      ) : (
        <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIListingPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sellerNotes, setSellerNotes] = useState("");
  const [originCountry, setOriginCountry] = useState("CN");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedListing | null>(null);
  const [activeLang, setActiveLang] = useState("en");
  const [expandedSpec, setExpandedSpec] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    const newImages: ImageFile[] = [];

    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const base64 = await fileToBase64(file);
      newImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        base64,
        mediaType: file.type,
      });
    }

    setImages((prev) => [...prev, ...newImages].slice(0, 5));
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const generateListing = async () => {
    if (images.length === 0) {
      toast.error("Upload at least one product photo");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/supplier/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({
            base64: img.base64,
            mediaType: img.mediaType,
          })),
          sellerNotes: sellerNotes || undefined,
          originCountry: originCountry || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Generation failed");
        return;
      }

      setResult(data.listing);
      setActiveLang("en");
      toast.success("Listing generated in 12 languages!");
    } catch {
      toast.error("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  const activeTranslation: Translation | null =
    activeLang === "en"
      ? result
        ? {
            name: result.name,
            description: result.description,
            shortDescription: result.shortDescription,
            tags: result.tags,
          }
        : null
      : result?.translations[activeLang] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/supplier/products"
            className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </Link>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              AI Listing Generator
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Upload product photos — AI generates descriptions, specs, and tags in 12 languages
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--amber) 12%, transparent)",
            color: "var(--amber-dark)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Powered
        </div>
      </div>

      {/* Upload Section */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Product Photos
        </h2>

        {/* Drop Zone */}
        <div
          className="relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer"
          style={{ borderColor: "var(--border-default)" }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "color-mix(in srgb, var(--amber) 10%, transparent)" }}
          >
            <ImagePlus className="w-7 h-7" style={{ color: "var(--amber)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Drop product photos here or click to browse
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Up to 5 images, max 5MB each. JPG, PNG, or WebP.
          </p>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex gap-3 mt-4 flex-wrap">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative w-24 h-24 rounded-xl overflow-hidden border group"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <img
                  src={img.preview}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "var(--danger)", color: "white" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Additional Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Seller Notes (optional)
            </label>
            <textarea
              value={sellerNotes}
              onChange={(e) => setSellerNotes(e.target.value)}
              placeholder="e.g. Grade A quality, hand-picked, organic certified..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Origin Country
            </label>
            <div className="relative">
              <select
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-5">
          <button
            onClick={generateListing}
            disabled={loading || images.length === 0}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: loading || images.length === 0 ? "var(--surface-tertiary)" : "var(--obsidian)",
              color: loading || images.length === 0 ? "var(--text-tertiary)" : "var(--ivory)",
              cursor: loading || images.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Analyzing photos & generating in 12 languages..." : "Generate AI Listing"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Language Tabs */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="flex items-center gap-1 p-3 overflow-x-auto"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <Globe className="w-4 h-4 shrink-0 mr-2" style={{ color: "var(--text-tertiary)" }} />
              {Object.entries(LANGUAGES).map(([code, lang]) => {
                const isActive = activeLang === code;
                const hasTranslation = code === "en" || result.translations[code];
                return (
                  <button
                    key={code}
                    onClick={() => setActiveLang(code)}
                    disabled={!hasTranslation}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? "var(--obsidian)" : "transparent",
                      color: isActive
                        ? "var(--ivory)"
                        : hasTranslation
                          ? "var(--text-secondary)"
                          : "var(--text-tertiary)",
                      opacity: hasTranslation ? 1 : 0.4,
                    }}
                  >
                    {lang.flag} {lang.name}
                  </button>
                );
              })}
            </div>

            {activeTranslation && (
              <div className="p-6 space-y-5">
                {/* Product Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                      Product Name
                    </label>
                    <CopyButton text={activeTranslation.name} />
                  </div>
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                  >
                    {activeTranslation.name}
                  </p>
                </div>

                {/* Short Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                      Short Description
                    </label>
                    <CopyButton text={activeTranslation.shortDescription} />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {activeTranslation.shortDescription}
                  </p>
                </div>

                {/* Full Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                      Full Description
                    </label>
                    <CopyButton text={activeTranslation.description} />
                  </div>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {activeTranslation.description}
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: "var(--text-tertiary)" }}>
                    Search Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeTranslation.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--amber) 10%, transparent)",
                          color: "var(--amber-dark)",
                        }}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Specs + Meta Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Specifications */}
            <div
              className="rounded-2xl border"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <button
                onClick={() => setExpandedSpec(!expandedSpec)}
                className="w-full flex items-center justify-between p-5"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: "var(--indigo)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Product Specifications
                  </h3>
                </div>
                <ChevronRight
                  className="w-4 h-4 transition-transform"
                  style={{
                    color: "var(--text-tertiary)",
                    transform: expandedSpec ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {expandedSpec && (
                <div className="px-5 pb-5">
                  <div className="space-y-2">
                    {Object.entries(result.specs).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                        style={{ background: "var(--surface-secondary)" }}
                      >
                        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                          {key}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trade Details */}
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Trade Details (AI Suggested)
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Category",
                    value: result.suggestedCategory.replace(/_/g, " "),
                    icon: Package,
                  },
                  {
                    label: "HS Code",
                    value: result.suggestedHsCode,
                    icon: FileText,
                  },
                  {
                    label: "Trade Term",
                    value: TRADE_TERM_LABELS[result.suggestedTradeTerm] || result.suggestedTradeTerm,
                    icon: Globe,
                  },
                  {
                    label: "Suggested MOQ",
                    value: `${result.suggestedMoq} units`,
                    icon: Layers,
                  },
                  ...(result.estimatedWeightKg
                    ? [
                        {
                          label: "Est. Weight",
                          value: `${result.estimatedWeightKg} kg`,
                          icon: Package,
                        },
                      ]
                    : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                    style={{ background: "var(--surface-secondary)" }}
                  >
                    <span className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </span>
                    <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            className="rounded-2xl border p-5 flex items-center justify-between"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Ready to create this product listing?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={generateListing}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                Regenerate
              </button>
              <Link
                href="/supplier/products/new"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
              >
                Use This Listing
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "color-mix(in srgb, var(--amber) 10%, transparent)" }}
          >
            <Upload className="w-8 h-8" style={{ color: "var(--amber)" }} />
          </div>
          <h3
            className="text-lg font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Upload Photos to Get Started
          </h3>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "var(--text-tertiary)" }}>
            Our AI analyzes your product photos and generates professional
            B2B listings with descriptions, specifications, and search tags —
            automatically translated into all 12 platform languages.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              {
                icon: ImagePlus,
                title: "Vision Analysis",
                desc: "AI identifies materials, colors, dimensions, and product type from photos",
              },
              {
                icon: Globe,
                title: "12 Languages",
                desc: "English, French, Chinese, Swahili, Arabic, Hausa, Yoruba, and 5 more",
              },
              {
                icon: Tag,
                title: "SEO Tags & Specs",
                desc: "Auto-generates search tags, HS codes, MOQ, and trade specifications",
              },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-xl" style={{ background: "var(--surface-secondary)" }}>
                <f.icon className="w-5 h-5 mb-2" style={{ color: "var(--amber)" }} />
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
