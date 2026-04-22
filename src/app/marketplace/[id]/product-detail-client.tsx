"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  Heart,
  Share2,
  MessageSquare,
  Package,
  ChevronRight,
  Minus,
  Plus,
  ArrowRight,
  Award,
  FileText,
  ShoppingCart,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { regionMeta } from "@/lib/product-labels";
import { applyMarkup } from "@/lib/pricing";

interface ProductData {
  id: string;
  name: string;
  nameLocal: string | null;
  description: string;
  basePrice: number;
  currency: string;
  moq: number;
  leadTimeDays: number | null;
  brand: string | null;
  originCountry: string | null;
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
  sampleAvailable: boolean;
  samplePrice: number | null;
}

interface ImageData {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
  currency: string;
}

interface Certification {
  id: string;
  certType: string;
  certNumber: string | null;
  documentUrl: string | null;
  validUntil: string | null;
}

interface Category {
  name: string;
  slug: string;
}

interface Props {
  product: ProductData;
  category: Category | null;
  images: ImageData[];
  tiers: PricingTier[];
  certifications: Certification[];
}

const CERT_LABELS: Record<string, string> = {
  "spec-sheet": "Spec sheet",
  iso: "ISO certification",
  ce: "CE marking",
  fda: "FDA approval",
  sgs: "SGS report",
  origin: "Certificate of origin",
  msds: "MSDS / safety data",
  other: "Other",
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value < 10 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function ProductDetailClient({
  product,
  category,
  images,
  tiers,
  certifications,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(product.moq);
  const [activeTab, setActiveTab] = useState<
    "description" | "specs" | "certifications"
  >("description");

  const region = regionMeta(product.originCountry);

  const activeTier =
    tiers.find(
      (t) =>
        quantity >= t.minQuantity &&
        (t.maxQuantity === null || quantity <= t.maxQuantity)
    ) ?? null;

  const unitPrice = applyMarkup(activeTier?.unitPrice ?? product.basePrice);
  const total = unitPrice * quantity;

  const currentImage = images[selectedImage]?.url;

  // Parse description into key:value specs where possible.
  // Matches lines like "Label: value" and leaves the rest as free prose.
  // Strip any http(s) URLs from the publicly-rendered description — buyers shouldn't
  // see off-platform links to suppliers or external sites.
  const URL_RE = /https?:\/\/\S+/gi;
  const stripUrls = (s: string) => s.replace(URL_RE, "").replace(/\s{2,}/g, " ").trim();
  const specs: { label: string; value: string }[] = [];
  const prose: string[] = [];
  for (const rawLine of product.description.split("\n")) {
    const line = stripUrls(rawLine);
    const trimmed = line.trim();
    if (!trimmed) {
      if (prose.length && prose[prose.length - 1] !== "") prose.push("");
      continue;
    }
    const match = trimmed.match(/^([^:：]+?)[:：]\s*(.+)$/);
    if (match && match[1].length <= 40) {
      const value = stripUrls(match[2]).trim();
      if (value) specs.push({ label: match[1].trim(), value });
    } else {
      prose.push(trimmed);
    }
  }

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[184px] bg-[var(--surface-secondary)] min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Link
                href="/marketplace"
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                Marketplace
              </Link>
              {category && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <Link
                    href={`/marketplace?category=${category.slug}`}
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    {category.name}
                  </Link>
                </>
              )}
              <ChevronRight className="w-3 h-3" />
              <span className="text-[var(--text-primary)] font-medium truncate">
                {product.name}
              </span>
            </div>
          </div>
        </div>

        {/* Product content */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left — images */}
              <div className="p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]">
                <div className="relative h-80 lg:h-[420px] rounded-xl bg-[var(--surface-secondary)] mb-4 overflow-hidden">
                  {currentImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImage}
                      alt={images[selectedImage]?.altText ?? product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-24 h-24 text-[var(--text-primary)] opacity-[0.08]" />
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      aria-label="Save to wishlist"
                      className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                    <button
                      aria-label="Share"
                      className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-3 flex-wrap">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(i)}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImage === i
                            ? "border-[var(--amber)]"
                            : "border-transparent hover:border-[var(--border-default)]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.altText}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right — info */}
              <div className="p-6 lg:p-10">
                <h1
                  className="text-xl lg:text-2xl font-bold text-[var(--obsidian)] leading-tight tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {product.name}
                </h1>
                {product.nameLocal && (
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                    {product.nameLocal}
                  </p>
                )}

                {(product.brand || product.originCountry) && (
                  <div className="flex items-center gap-2 flex-wrap mt-4">
                    {product.brand && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                        {product.brand}
                      </span>
                    )}
                    {product.originCountry && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                        <span aria-hidden className="text-sm leading-none">{region.flag}</span>
                        {region.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Price block */}
                <div className="mt-6 p-5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                  {tiers.length > 0 ? (
                    <div
                      className={`grid gap-2 mb-4 ${
                        tiers.length <= 3 ? "grid-cols-3" : "grid-cols-4"
                      }`}
                    >
                      {tiers.map((tier) => {
                        const isActive =
                          quantity >= tier.minQuantity &&
                          (tier.maxQuantity === null ||
                            quantity <= tier.maxQuantity);
                        return (
                          <button
                            key={tier.minQuantity}
                            onClick={() => setQuantity(tier.minQuantity)}
                            className={`text-center p-3 rounded-lg border transition-colors ${
                              isActive
                                ? "bg-[var(--amber)]/10 border-[var(--amber)]/30"
                                : "bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                            }`}
                          >
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">
                              {tier.minQuantity}–{tier.maxQuantity ?? "∞"}
                            </div>
                            <div
                              className="text-base font-bold text-[var(--obsidian)]"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {formatMoney(applyMarkup(tier.unitPrice), tier.currency)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[var(--text-tertiary)]">
                      Your price:
                    </span>
                    <span
                      className="text-3xl font-bold text-[var(--obsidian)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {formatMoney(unitPrice, product.currency)}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      / unit
                    </span>
                  </div>
                </div>

                {/* Quantity + totals */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Quantity
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setQuantity((q) => Math.max(product.moq, q - 1))
                        }
                        className="w-9 h-9 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)]"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(
                              product.moq,
                              parseInt(e.target.value) || product.moq
                            )
                          )
                        }
                        className="w-20 h-9 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)]"
                        min={product.moq}
                      />
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-9 h-9 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)]"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Estimated total</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatMoney(total, product.currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                      <p className="text-[var(--text-tertiary)]">MOQ</p>
                      <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                        {product.moq.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                      <p className="text-[var(--text-tertiary)]">Lead time</p>
                      <p className="font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {product.leadTimeDays ? `${product.leadTimeDays} days` : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                      <p className="text-[var(--text-tertiary)]">Sample</p>
                      <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                        {product.sampleAvailable
                          ? product.samplePrice
                            ? formatMoney(applyMarkup(product.samplePrice), product.currency)
                            : "Available"
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button className="btn-primary flex-1 justify-center">
                    <ShoppingCart className="w-4 h-4" />
                    Place order
                  </button>
                  <button className="btn-secondary flex-1 justify-center">
                    <MessageSquare className="w-4 h-4" />
                    Request quote
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[var(--text-tertiary)] leading-snug">
                  Orders are fulfilled through the platform — we coordinate with the manufacturer on your behalf.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-[var(--border-subtle)]">
              <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto">
                {(
                  [
                    { key: "description", label: "Description" },
                    { key: "specs", label: `Specifications${specs.length ? ` (${specs.length})` : ""}` },
                    {
                      key: "certifications",
                      label: `Documents${certifications.length ? ` (${certifications.length})` : ""}`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-[var(--amber)] text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6 lg:p-10">
                {activeTab === "description" && (
                  <div className="max-w-3xl space-y-6">
                    {prose.length > 0 ? (
                      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {prose.join("\n")}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text-tertiary)]">
                        No description provided.
                      </p>
                    )}
                    {product.usageInstructions && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                          How to use
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {product.usageInstructions}
                        </p>
                      </div>
                    )}
                    {product.storageInstructions && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                          Storage & handling
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {product.storageInstructions}
                        </p>
                      </div>
                    )}
                    {product.warnings && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                          Warnings
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {product.warnings}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "specs" && (
                  <div>
                    {specs.length > 0 ? (
                      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 max-w-3xl">
                        {specs.map((s, i) => (
                          <div
                            key={i}
                            className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2"
                          >
                            <dt className="text-xs text-[var(--text-tertiary)]">
                              {s.label}
                            </dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)] text-right">
                              {s.value}
                            </dd>
                          </div>
                        ))}
                        {product.hsCode && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">HS code</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.hsCode}</dd>
                          </div>
                        )}
                        {product.janCode && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Barcode</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.janCode}</dd>
                          </div>
                        )}
                        {product.weightKg != null && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Weight per unit</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.weightKg} kg</dd>
                          </div>
                        )}
                        {product.shelfLifeDays != null && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Shelf life</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.shelfLifeDays} days</dd>
                          </div>
                        )}
                        {product.boxPackQty != null && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Units per box</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.boxPackQty}</dd>
                          </div>
                        )}
                        {product.shippingMode && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Shipping</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)] capitalize">
                              {product.shippingMode === "either" ? "Air or Sea" : product.shippingMode}
                            </dd>
                          </div>
                        )}
                        {product.legalCategory && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Category</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.legalCategory}</dd>
                          </div>
                        )}
                        {product.targetAudience && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">For</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.targetAudience}</dd>
                          </div>
                        )}
                        {product.skinHairType && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Skin / hair</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.skinHairType}</dd>
                          </div>
                        )}
                        {product.scent && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Scent</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.scent}</dd>
                          </div>
                        )}
                        {product.texture && (
                          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                            <dt className="text-xs text-[var(--text-tertiary)]">Texture</dt>
                            <dd className="text-xs font-medium text-[var(--text-primary)]">{product.texture}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-[var(--text-tertiary)]">
                        No structured specifications yet.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "certifications" && (
                  <div>
                    {certifications.length > 0 ? (
                      <ul className="space-y-2 max-w-3xl">
                        {certifications.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 bg-[var(--surface-secondary)]"
                          >
                            <div className="w-9 h-9 rounded-md bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0">
                              <Award className="w-4 h-4 text-[var(--text-secondary)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {CERT_LABELS[c.certType] ?? c.certType}
                                </span>
                                {c.certNumber && (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    #{c.certNumber}
                                  </span>
                                )}
                                {c.validUntil && (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    valid until {c.validUntil}
                                  </span>
                                )}
                              </div>
                              {c.documentUrl && (
                                <a
                                  href={c.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--amber-dark)] hover:underline"
                                >
                                  View document
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--text-tertiary)]">
                        No documents attached to this product yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aside strip */}
          <div className="mt-6">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-[var(--amber)] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Platform-coordinated order
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  You place an order; we handle payment, production, and shipping on your behalf.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--amber)] fill-[var(--amber)]" />
              <span className="text-sm text-[var(--text-tertiary)]">
                Reviews coming soon.
              </span>
            </div>
            <Link
              href="/marketplace"
              className="text-sm text-[var(--amber-dark)] hover:underline inline-flex items-center gap-1"
            >
              Back to marketplace
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
