"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  Star,
  Shield,
  CheckCircle2,
  MapPin,
  Clock,
  Heart,
  Share2,
  MessageSquare,
  Package,
  Truck,
  CreditCard,
  ChevronRight,
  Minus,
  Plus,
  ArrowRight,
  Globe,
  Factory,
  Award,
  FileText,
  AlertCircle,
  Users,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";

/* Mock product data */
const PRODUCT = {
  id: "1",
  name: "Industrial CNC Laser Cutting Machine 3000W Fiber Laser — Metal Sheet Processing",
  supplier: {
    name: "Guangzhou HuaNan Precision Machinery Co., Ltd.",
    verified: true,
    goldSupplier: true,
    yearsOnPlatform: 6,
    responseRate: "98%",
    responseTime: "< 24h",
    province: "Guangdong",
    country: "China",
    employees: "500-999",
    revenue: "$10M-50M",
    rating: 4.8,
    reviews: 142,
    transactions: 1240,
    onTimeDelivery: "96%",
  },
  priceTiers: [
    { min: 1, max: 2, price: 12000 },
    { min: 3, max: 5, price: 10500 },
    { min: 6, max: 10, price: 9200 },
    { min: 11, max: null, price: 8500 },
  ],
  moq: 1,
  unit: "Set",
  leadTime: "15-25 days",
  port: "Guangzhou / Shenzhen",
  paymentTerms: ["T/T", "L/C", "Trade Assurance"],
  tradeAssurance: true,
  certifications: ["CE", "ISO 9001", "SGS Verified"],
  specs: [
    { label: "Laser Power", value: "3000W" },
    { label: "Working Area", value: "1500 x 3000mm" },
    { label: "Max Speed", value: "60m/min" },
    { label: "Positioning Accuracy", value: "±0.03mm" },
    { label: "Applicable Material", value: "Carbon Steel, Stainless Steel, Aluminum, Brass, Copper" },
    { label: "Max Cutting Thickness", value: "22mm (Carbon Steel)" },
    { label: "Machine Weight", value: "5800kg" },
    { label: "Power Supply", value: "380V / 50Hz / 3 Phase" },
    { label: "Cooling System", value: "Industrial Water Chiller" },
    { label: "Control System", value: "Cypcut / BCS100" },
  ],
  description:
    "Professional-grade 3000W fiber laser cutting machine designed for high-precision metal processing. Features IPG/Raycus laser source, Precitec cutting head, and Yaskawa servo motors for exceptional accuracy and speed. Suitable for cutting carbon steel up to 22mm, stainless steel up to 12mm, and aluminum up to 10mm. Widely used in automotive, aerospace, elevator, and metal fabrication industries.",
  images: [
    "from-slate-200 to-slate-300",
    "from-slate-150 to-gray-250",
    "from-zinc-200 to-slate-300",
    "from-neutral-200 to-stone-300",
  ],
  rating: 4.8,
  reviews: 142,
  category: "Machinery & Equipment",
  subcategory: "Laser Cutting Machines",
  tags: ["Trade Assurance", "Hot Sale"],
};

const RELATED_PRODUCTS = [
  {
    id: "r1",
    name: "CO2 Laser Engraving Machine 130W",
    price: 2800,
    moq: 1,
    image: "from-blue-100 to-indigo-200",
    supplier: "Jinan LaserTech",
    rating: 4.6,
  },
  {
    id: "r2",
    name: "Plasma Cutting Machine CNC Table",
    price: 4500,
    moq: 1,
    image: "from-orange-100 to-amber-200",
    supplier: "Shandong CutPro",
    rating: 4.7,
  },
  {
    id: "r3",
    name: "Metal Bending Machine 160T Hydraulic",
    price: 15000,
    moq: 1,
    image: "from-green-100 to-emerald-200",
    supplier: "Nantong ForgeMax",
    rating: 4.5,
  },
  {
    id: "r4",
    name: "Welding Robot 6-Axis Industrial",
    price: 22000,
    moq: 1,
    image: "from-purple-100 to-violet-200",
    supplier: "Shanghai RoboWeld",
    rating: 4.8,
  },
];

export default function ProductDetailPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "description" | "reviews" | "supplier">("specs");

  const currentPrice =
    PRODUCT.priceTiers.find(
      (t) => quantity >= t.min && (t.max === null || quantity <= t.max)
    )?.price ?? PRODUCT.priceTiers[0].price;

  return (
    <>
      <Navbar />
      <main className="pt-[68px] lg:pt-[148px] bg-[var(--surface-secondary)] min-h-screen">
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
              <ChevronRight className="w-3 h-3" />
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                {PRODUCT.category}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[var(--text-primary)] font-medium">
                {PRODUCT.subcategory}
              </span>
            </div>
          </div>
        </div>

        {/* Product content */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left - Images */}
              <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]">
                {/* Main image */}
                <div
                  className={`relative h-80 lg:h-[420px] rounded-xl bg-gradient-to-br ${PRODUCT.images[selectedImage]} mb-4 overflow-hidden`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-24 h-24 text-[var(--text-primary)] opacity-[0.06]" />
                  </div>

                  {/* Tags */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {PRODUCT.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                          tag === "Trade Assurance"
                            ? "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20"
                            : "bg-[var(--terracotta)]/15 text-[var(--terracotta)] border border-[var(--terracotta)]/20"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
                      <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
                      <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-3">
                  {PRODUCT.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-20 h-20 rounded-lg bg-gradient-to-br ${img} border-2 transition-colors ${
                        selectedImage === i
                          ? "border-[var(--amber)]"
                          : "border-transparent hover:border-[var(--border-default)]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Right - Info */}
              <div className="p-8 lg:p-10">
                <h1
                  className="text-xl lg:text-2xl font-bold text-[var(--obsidian)] leading-tight tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {PRODUCT.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(PRODUCT.rating)
                              ? "text-[var(--amber)] fill-[var(--amber)]"
                              : "text-[var(--border-strong)]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {PRODUCT.rating}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      ({PRODUCT.reviews} reviews)
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {PRODUCT.supplier.transactions} orders
                  </span>
                </div>

                {/* Price tiers */}
                <div className="mt-6 p-5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {PRODUCT.priceTiers.map((tier) => (
                      <div
                        key={tier.min}
                        className={`text-center p-3 rounded-lg border transition-colors cursor-pointer ${
                          quantity >= tier.min &&
                          (tier.max === null || quantity <= tier.max)
                            ? "bg-[var(--amber)]/10 border-[var(--amber)]/30"
                            : "bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                        }`}
                      >
                        <div className="text-xs text-[var(--text-tertiary)] mb-1">
                          {tier.min}-{tier.max ?? "∞"} {PRODUCT.unit}s
                        </div>
                        <div
                          className="text-lg font-bold text-[var(--obsidian)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          ${tier.price.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[var(--text-tertiary)]">
                      Your price:
                    </span>
                    <span
                      className="text-3xl font-bold text-[var(--obsidian)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ${currentPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      / {PRODUCT.unit}
                    </span>
                  </div>
                </div>

                {/* Key details */}
                <div className="mt-6 space-y-3">
                  {[
                    {
                      label: "MOQ",
                      value: `${PRODUCT.moq} ${PRODUCT.unit}`,
                      icon: Package,
                    },
                    {
                      label: "Lead Time",
                      value: PRODUCT.leadTime,
                      icon: Clock,
                    },
                    {
                      label: "Shipping Port",
                      value: PRODUCT.port,
                      icon: Truck,
                    },
                    {
                      label: "Payment",
                      value: PRODUCT.paymentTerms.join(", "),
                      icon: CreditCard,
                    },
                  ].map((detail) => (
                    <div key={detail.label} className="flex items-center gap-3">
                      <detail.icon className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-sm text-[var(--text-tertiary)] w-24 shrink-0">
                        {detail.label}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Certifications */}
                <div className="mt-5 flex items-center gap-2">
                  {PRODUCT.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                    >
                      {cert}
                    </span>
                  ))}
                </div>

                {/* Quantity + Actions */}
                <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-4 mb-5">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Quantity:
                    </span>
                    <div className="flex items-center border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-16 h-10 text-center text-sm font-semibold border-x border-[var(--border-subtle)] outline-none"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {PRODUCT.unit}s
                    </span>
                  </div>

                  <div className="text-sm text-[var(--text-secondary)] mb-5">
                    Total:{" "}
                    <strong
                      className="text-lg text-[var(--obsidian)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ${(currentPrice * quantity).toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-primary flex-1 !rounded-xl !py-3.5">
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button className="btn-outline flex-1 !rounded-xl !py-3.5">
                      <MessageSquare className="w-4 h-4" />
                      Contact Supplier
                    </button>
                  </div>

                  <Link
                    href="/rfq"
                    className="flex items-center justify-center gap-2 mt-3 py-3 text-sm font-medium text-[var(--indigo-light)] hover:text-[var(--indigo)] transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Request Quotation for Custom Requirements
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Trade assurance badge */}
                {PRODUCT.tradeAssurance && (
                  <div className="mt-5 p-4 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/15">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-[var(--success)]" />
                      <span className="text-sm font-semibold text-[var(--success)]">
                        Trade Assurance
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Your payment is protected. If the product is not as
                      described or not delivered, you get a full refund.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs section */}
          <div className="mt-8 bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            {/* Tab headers */}
            <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto">
              {(
                [
                  { key: "specs", label: "Specifications" },
                  { key: "description", label: "Product Description" },
                  { key: "reviews", label: `Reviews (${PRODUCT.reviews})` },
                  { key: "supplier", label: "Supplier Profile" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? "border-[var(--amber)] text-[var(--obsidian)]"
                      : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-8 lg:p-10">
              {activeTab === "specs" && (
                <div className="grid sm:grid-cols-2 gap-x-12 gap-y-4">
                  {PRODUCT.specs.map((spec, i) => (
                    <div
                      key={spec.label}
                      className={`flex items-start gap-3 py-3 ${
                        i < PRODUCT.specs.length - (PRODUCT.specs.length % 2 === 0 ? 2 : 1)
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      <span className="text-sm text-[var(--text-tertiary)] w-40 shrink-0">
                        {spec.label}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "description" && (
                <div className="prose max-w-none">
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {PRODUCT.description}
                  </p>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="text-center py-12">
                  <Star className="w-10 h-10 text-[var(--amber)] mx-auto mb-4 opacity-30" />
                  <p className="text-[var(--text-tertiary)]">
                    Reviews will be displayed here
                  </p>
                </div>
              )}

              {activeTab === "supplier" && (
                <div className="grid sm:grid-cols-2 gap-10">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-[var(--indigo)]/10 border border-[var(--indigo)]/15 flex items-center justify-center">
                        <Factory className="w-6 h-6 text-[var(--indigo)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--obsidian)]">
                          {PRODUCT.supplier.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {PRODUCT.supplier.verified && (
                            <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                          {PRODUCT.supplier.goldSupplier && (
                            <span className="flex items-center gap-1 text-xs text-[var(--amber-dark)]">
                              <Award className="w-3 h-3" /> Gold Supplier
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          icon: MapPin,
                          label: "Location",
                          value: `${PRODUCT.supplier.province}, ${PRODUCT.supplier.country}`,
                        },
                        {
                          icon: Users,
                          label: "Employees",
                          value: PRODUCT.supplier.employees,
                        },
                        {
                          icon: TrendingUp,
                          label: "Annual Revenue",
                          value: PRODUCT.supplier.revenue,
                        },
                        {
                          icon: Globe,
                          label: "Years on Platform",
                          value: `${PRODUCT.supplier.yearsOnPlatform} years`,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3"
                        >
                          <item.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-tertiary)] w-32">
                            {item.label}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                      Performance
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Response Rate", value: PRODUCT.supplier.responseRate },
                        { label: "Response Time", value: PRODUCT.supplier.responseTime },
                        { label: "On-Time Delivery", value: PRODUCT.supplier.onTimeDelivery },
                        { label: "Transactions", value: PRODUCT.supplier.transactions.toLocaleString() },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
                        >
                          <div
                            className="text-xl font-bold text-[var(--obsidian)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {metric.value}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-1">
                            {metric.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="mt-6 btn-outline w-full !rounded-xl">
                      View Full Supplier Profile
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related products */}
          <div className="mt-8 mb-12">
            <h2
              className="text-xl font-bold text-[var(--obsidian)] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Related Products
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {RELATED_PRODUCTS.map((product) => (
                <Link
                  key={product.id}
                  href={`/marketplace/${product.id}`}
                  className="card-elevated block overflow-hidden"
                >
                  <div
                    className={`h-40 bg-gradient-to-br ${product.image} relative`}
                  >
                    <Package className="absolute inset-0 m-auto w-12 h-12 text-[var(--text-primary)] opacity-[0.05]" />
                  </div>
                  <div className="p-4">
                    <div
                      className="text-lg font-bold text-[var(--obsidian)] mb-1"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ${product.price.toLocaleString()}
                    </div>
                    <h3 className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <Star className="w-3 h-3 text-[var(--amber)] fill-[var(--amber)]" />
                      {product.rating}
                      <span>· {product.supplier}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
