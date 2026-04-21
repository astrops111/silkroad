"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
  MessageSquare,
  User,
  Heart,
  Package,
  Coffee,
  Factory,
  Gem,
  Truck,
  Leaf,
  Zap,
  FileText,
  Shirt,
  Wrench,
  Sprout,
  Wheat,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { RegionPicker } from "@/components/ui/region-picker";

type Subgroup = { label: string; href: string };
type CategoryGroup = {
  label: string;
  href: string;
  icon: LucideIcon;
  subgroups?: Subgroup[];
  featured?: { title: string; description: string; image: string; href: string };
};

/* Category labels are intentionally English here — they're swapped to
   t("nav.categoryX") at render time below. */
const PRODUCT_CATEGORIES: CategoryGroup[] = [
  { label: "All", href: "/marketplace", icon: Package },
  {
    label: "Electronics",
    href: "/marketplace?category=electronics",
    icon: Zap,
    subgroups: [
      { label: "Smartphones & Tablets", href: "/marketplace?category=electronics&sub=phones" },
      { label: "Laptops & PCs", href: "/marketplace?category=electronics&sub=computers" },
      { label: "Components & Chips", href: "/marketplace?category=electronics&sub=components" },
      { label: "LED Lighting", href: "/marketplace?category=electronics&sub=lighting" },
      { label: "Audio & Headphones", href: "/marketplace?category=electronics&sub=audio" },
      { label: "Cameras & Imaging", href: "/marketplace?category=electronics&sub=cameras" },
      { label: "Networking Equipment", href: "/marketplace?category=electronics&sub=networking" },
      { label: "Wearables & Smart Home", href: "/marketplace?category=electronics&sub=wearables" },
    ],
    featured: {
      title: "5G smartphone OEM bulk",
      description: "MOQ 100 units · From $85",
      image:
        "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=electronics&promo=oem",
    },
  },
  {
    label: "Machinery",
    href: "/marketplace?category=machinery",
    icon: Factory,
    subgroups: [
      { label: "CNC & Lathes", href: "/marketplace?category=machinery&sub=cnc" },
      { label: "Hydraulic Equipment", href: "/marketplace?category=machinery&sub=hydraulic" },
      { label: "Generators", href: "/marketplace?category=machinery&sub=generators" },
      { label: "Pumps & Motors", href: "/marketplace?category=machinery&sub=pumps" },
      { label: "Forklifts & Loaders", href: "/marketplace?category=machinery&sub=forklifts" },
      { label: "Welders & Cutters", href: "/marketplace?category=machinery&sub=welders" },
      { label: "Air Compressors", href: "/marketplace?category=machinery&sub=compressors" },
      { label: "Food Processing", href: "/marketplace?category=machinery&sub=food" },
    ],
    featured: {
      title: "Hydraulic excavator 21t",
      description: "From $42,000 · Lead time 30d",
      image:
        "https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=machinery&promo=excavator",
    },
  },
  {
    label: "Textiles",
    href: "/marketplace?category=textiles",
    icon: Shirt,
    subgroups: [
      { label: "Apparel & Garments", href: "/marketplace?category=textiles&sub=apparel" },
      { label: "Fabrics & Rolls", href: "/marketplace?category=textiles&sub=fabrics" },
      { label: "Yarn & Threads", href: "/marketplace?category=textiles&sub=yarn" },
      { label: "Trims & Accessories", href: "/marketplace?category=textiles&sub=trims" },
      { label: "Footwear", href: "/marketplace?category=textiles&sub=footwear" },
      { label: "Bags & Luggage", href: "/marketplace?category=textiles&sub=bags" },
      { label: "Home Linens", href: "/marketplace?category=textiles&sub=linens" },
      { label: "Workwear & Uniforms", href: "/marketplace?category=textiles&sub=workwear" },
    ],
    featured: {
      title: "Custom-print cotton tees",
      description: "MOQ 500 pcs · From $2.80",
      image:
        "https://images.pexels.com/photos/34191411/pexels-photo-34191411.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=textiles&promo=tees",
    },
  },
  {
    label: "Construction",
    href: "/marketplace?category=construction",
    icon: Wrench,
    subgroups: [
      { label: "Cement & Aggregate", href: "/marketplace?category=construction&sub=cement" },
      { label: "Steel & Rebar", href: "/marketplace?category=construction&sub=steel" },
      { label: "Tools & Hardware", href: "/marketplace?category=construction&sub=tools" },
      { label: "Plumbing & Sanitary", href: "/marketplace?category=construction&sub=plumbing" },
      { label: "Roofing & Insulation", href: "/marketplace?category=construction&sub=roofing" },
      { label: "Solar & Off-Grid", href: "/marketplace?category=construction&sub=solar" },
      { label: "Glass & Aluminum", href: "/marketplace?category=construction&sub=glass" },
      { label: "Paint & Finishes", href: "/marketplace?category=construction&sub=paint" },
    ],
    featured: {
      title: "Tier-1 solar panels 550W",
      description: "MOQ 10 panels · From $110",
      image:
        "https://images.pexels.com/photos/4993793/pexels-photo-4993793.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=construction&promo=solar",
    },
  },
  { label: "RFQ", href: "/dashboard/rfq", icon: FileText },
];

const COMMODITY_CATEGORIES: CategoryGroup[] = [
  { label: "All", href: "/commodities/browse", icon: Package },
  {
    label: "Coffee",
    href: "/commodities/browse?category=coffee",
    icon: Coffee,
    subgroups: [
      { label: "Arabica Green Beans", href: "/commodities/browse?category=coffee&sub=arabica" },
      { label: "Robusta Green Beans", href: "/commodities/browse?category=coffee&sub=robusta" },
      { label: "Roasted Whole Bean", href: "/commodities/browse?category=coffee&sub=roasted" },
      { label: "Specialty Single-Estate", href: "/commodities/browse?category=coffee&sub=specialty" },
      { label: "Instant Coffee", href: "/commodities/browse?category=coffee&sub=instant" },
      { label: "Roasting Equipment", href: "/commodities/browse?category=coffee&sub=equipment" },
    ],
    featured: {
      title: "Yirgacheffe Grade 1",
      description: "Ethiopia · $7.20/kg",
      image:
        "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/commodities/browse?category=coffee&promo=yirgacheffe",
    },
  },
  {
    label: "Cocoa",
    href: "/commodities/browse?category=cocoa",
    icon: Leaf,
    subgroups: [
      { label: "Cocoa Beans", href: "/commodities/browse?category=cocoa&sub=beans" },
      { label: "Cocoa Powder", href: "/commodities/browse?category=cocoa&sub=powder" },
      { label: "Cocoa Liquor", href: "/commodities/browse?category=cocoa&sub=liquor" },
      { label: "Cocoa Butter", href: "/commodities/browse?category=cocoa&sub=butter" },
      { label: "Couverture", href: "/commodities/browse?category=cocoa&sub=couverture" },
      { label: "Cocoa Husk", href: "/commodities/browse?category=cocoa&sub=husk" },
    ],
    featured: {
      title: "Fair-trade organic beans",
      description: "Ghana · $3.20/kg",
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/commodities/browse?category=cocoa&promo=organic",
    },
  },
  {
    label: "Tea & Spices",
    href: "/commodities/browse?category=tea",
    icon: Sprout,
    subgroups: [
      { label: "Black Tea CTC", href: "/commodities/browse?category=tea&sub=black" },
      { label: "Green Tea", href: "/commodities/browse?category=tea&sub=green" },
      { label: "Specialty & Herbal", href: "/commodities/browse?category=tea&sub=specialty" },
      { label: "Cardamom", href: "/commodities/browse?category=spices&sub=cardamom" },
      { label: "Vanilla Beans", href: "/commodities/browse?category=spices&sub=vanilla" },
      { label: "Cloves & Pepper", href: "/commodities/browse?category=spices&sub=cloves" },
    ],
    featured: {
      title: "Bourbon vanilla beans",
      description: "Madagascar · $340/kg",
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/commodities/browse?category=spices&promo=vanilla",
    },
  },
  {
    label: "Minerals",
    href: "/commodities/browse?category=minerals",
    icon: Gem,
    subgroups: [
      { label: "Cobalt", href: "/commodities/browse?category=minerals&sub=cobalt" },
      { label: "Copper", href: "/commodities/browse?category=minerals&sub=copper" },
      { label: "Lithium", href: "/commodities/browse?category=minerals&sub=lithium" },
      { label: "Gold & Precious", href: "/commodities/browse?category=minerals&sub=gold" },
      { label: "Tantalum & Coltan", href: "/commodities/browse?category=minerals&sub=tantalum" },
      { label: "Manganese", href: "/commodities/browse?category=minerals&sub=manganese" },
      { label: "Iron Ore", href: "/commodities/browse?category=minerals&sub=iron" },
      { label: "Bauxite", href: "/commodities/browse?category=minerals&sub=bauxite" },
    ],
    featured: {
      title: "Battery-grade cobalt",
      description: "DRC · $32k/tonne",
      image:
        "https://images.pexels.com/photos/33192/paddle-wheel-bucket-wheel-excavators-brown-coal-open-pit-mining.jpg?auto=compress&cs=tinysrgb&w=600",
      href: "/commodities/browse?category=minerals&promo=cobalt",
    },
  },
  {
    label: "Specialty Crops",
    href: "/commodities/browse?category=specialty",
    icon: Wheat,
    subgroups: [
      { label: "Shea Butter", href: "/commodities/browse?category=specialty&sub=shea" },
      { label: "Cashew Nuts", href: "/commodities/browse?category=specialty&sub=cashew" },
      { label: "Sesame Seeds", href: "/commodities/browse?category=specialty&sub=sesame" },
      { label: "Hibiscus", href: "/commodities/browse?category=specialty&sub=hibiscus" },
      { label: "Moringa", href: "/commodities/browse?category=specialty&sub=moringa" },
      { label: "Baobab", href: "/commodities/browse?category=specialty&sub=baobab" },
    ],
    featured: {
      title: "Raw shea butter",
      description: "Burkina Faso · $6.80/kg",
      image:
        "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/commodities/browse?category=specialty&promo=shea",
    },
  },
  { label: "RFQ", href: "/dashboard/rfq", icon: FileText },
];

export function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();

  // Map a category English label to its translation key under nav.*.
  const labelKeyMap: Record<string, string> = {
    All: "all",
    Electronics: "categoryElectronics",
    Machinery: "categoryMachinery",
    Textiles: "categoryTextiles",
    Construction: "categoryConstruction",
    Coffee: "categoryCoffee",
    Cocoa: "categoryCocoa",
    "Tea & Spices": "categoryTeaSpices",
    Minerals: "categoryMinerals",
    "Specialty Crops": "categorySpecialtyCrops",
    RFQ: "rfq",
  };
  const tCat = (label: string) =>
    labelKeyMap[label] ? t(labelKeyMap[label]) : label;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "products" | "commodities" | "suppliers">("all");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const categoryStripRef = useRef<HTMLDivElement>(null);

  const portal: "products" | "commodities" =
    pathname?.startsWith("/commodities") ? "commodities" : "products";

  const activeCategoryGroups: CategoryGroup[] =
    portal === "commodities" ? COMMODITY_CATEGORIES : PRODUCT_CATEGORIES;

  const TOP_LINKS = [
    { label: t("products"), href: "/marketplace" },
    { label: t("commodities"), href: "/commodities" },
    { label: t("suppliers"), href: "/suppliers" },
    { label: t("rfq"), href: "/dashboard/rfq" },
    { label: t("tradeAssurance"), href: "/trade-assurance" },
  ];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false);
      }
      if (
        categoryStripRef.current &&
        !categoryStripRef.current.contains(e.target as Node)
      ) {
        setOpenCategory(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenCategory(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Close any open mega-menu when the route changes.
  useEffect(() => {
    setOpenCategory(null);
  }, [pathname]);

  const scopeLabel: Record<typeof scope, string> = {
    all: t("scopeAll"),
    products: t("scopeProducts"),
    commodities: t("scopeCommodities"),
    suppliers: t("scopeSuppliers"),
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-subtle)]">
        {/* Utility row - small links above main bar */}
        <div className="hidden lg:block border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-9 flex items-center justify-end gap-6 text-[12px] text-[var(--text-tertiary)]">
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">
              {t("about")}
            </Link>
            <Link href="/how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
              {t("howItWorks")}
            </Link>
            <Link href="/sell" className="hover:text-[var(--text-primary)] transition-colors">
              {t("sell")}
            </Link>
            <Link href="/help" className="hover:text-[var(--text-primary)] transition-colors">
              {t("help")}
            </Link>
            <span className="w-px h-3 bg-[var(--border-default)]" />
            <RegionPicker variant="compact" />
          </div>
        </div>

        {/* Main bar */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-4 lg:gap-6 h-[68px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--amber)] to-[var(--amber-dark)] flex items-center justify-center group-hover:shadow-md transition-shadow">
                <span
                  className="font-black text-[var(--obsidian)] text-sm tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  SR
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className="text-[16px] font-bold tracking-tight leading-none text-[var(--obsidian)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Silk Road
                </span>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase leading-none mt-1 text-[var(--amber-dark)]">
                  Africa
                </span>
              </div>
            </Link>

            {/* Portal toggle — Products | Commodities */}
            <div
              className="hidden md:inline-flex items-center p-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] shrink-0"
              role="tablist"
              aria-label="Switch portal"
            >
              <Link
                href="/"
                role="tab"
                aria-selected={portal === "products"}
                className={`px-3.5 lg:px-4 h-8 inline-flex items-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  portal === "products"
                    ? "bg-[var(--obsidian)] text-[var(--ivory)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                {t("products")}
              </Link>
              <Link
                href="/commodities"
                role="tab"
                aria-selected={portal === "commodities"}
                className={`px-3.5 lg:px-4 h-8 inline-flex items-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  portal === "commodities"
                    ? "bg-[var(--obsidian)] text-[var(--ivory)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                {t("commodities")}
              </Link>
            </div>

            {/* Search bar — IKEA-style: scope + input + button */}
            <form
              action="/marketplace"
              className="hidden md:flex flex-1 max-w-[760px] h-12 rounded-full border border-[var(--border-default)] hover:border-[var(--text-tertiary)] focus-within:border-[var(--obsidian)] focus-within:shadow-[0_0_0_3px_rgba(212,168,83,0.15)] bg-white transition-all overflow-hidden"
            >
              {/* Scope selector */}
              <div className="relative" ref={scopeRef}>
                <button
                  type="button"
                  onClick={() => setScopeOpen(!scopeOpen)}
                  className="h-full pl-5 pr-3 flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-r border-[var(--border-subtle)]"
                >
                  {scopeLabel[scope]}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {scopeOpen && (
                  <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[var(--border-subtle)] py-2 animate-scale-in z-10">
                    {(["all", "products", "commodities", "suppliers"] as const).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => {
                          setScope(s);
                          setScopeOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {scopeLabel[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="search"
                name="q"
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="submit"
                aria-label={t("searchButton")}
                className="h-full px-5 bg-[var(--obsidian)] text-[var(--ivory)] hover:bg-[var(--obsidian-light)] transition-colors flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Utility cluster */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">
              <Link
                href="/messages"
                aria-label={t("inbox")}
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{t("inbox")}</span>
              </Link>

              <Link
                href="/saved"
                aria-label={t("saved")}
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{t("saved")}</span>
              </Link>

              <Link
                href="/auth/login"
                aria-label={tc("signIn")}
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{tc("signIn")}</span>
              </Link>

              <Link
                href="/cart"
                aria-label={t("cart")}
                className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden md:inline text-[10px] mt-0.5">{t("cart")}</span>
                <span className="absolute top-0.5 right-1.5 w-4 h-4 bg-[var(--terracotta)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t("menu")}
                className="lg:hidden p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary category strip with click-toggle mega-menus */}
        <div
          ref={categoryStripRef}
          className="hidden lg:block border-t border-[var(--border-subtle)] bg-white relative"
        >
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
            <div className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-hide">
              {activeCategoryGroups.map((cat) => {
                const hasMenu = !!cat.subgroups?.length;
                const isOpen = openCategory === cat.label;

                if (!hasMenu) {
                  return (
                    <Link
                      key={cat.label}
                      href={cat.href}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      {tCat(cat.label)}
                    </Link>
                  );
                }

                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() =>
                      setOpenCategory((prev) => (prev === cat.label ? null : cat.label))
                    }
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                      isOpen
                        ? "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {tCat(cat.label)}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-auto shrink-0 flex items-center gap-3 pl-4 text-[12px] text-[var(--text-tertiary)]">
                {TOP_LINKS.slice(3).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </span>
            </div>
          </div>

          {/* Mega-menu panel */}
          {openCategory &&
            (() => {
              const cat = activeCategoryGroups.find((c) => c.label === openCategory);
              if (!cat?.subgroups?.length) return null;
              return (
                <div className="absolute top-full left-0 right-0 bg-white border-b border-[var(--border-subtle)] shadow-lg z-40 animate-fade-in">
                  <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
                    <div className="grid grid-cols-12 gap-8">
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-[var(--amber)]/10 flex items-center justify-center">
                            <cat.icon className="w-4 h-4 text-[var(--amber-dark)]" />
                          </div>
                          <span
                            className="text-base font-bold text-[var(--obsidian)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {tCat(cat.label)}
                          </span>
                        </div>
                        <Link
                          href={cat.href}
                          onClick={() => setOpenCategory(null)}
                          className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-semibold text-[var(--amber-dark)] hover:gap-2 transition-all"
                        >
                          {t("seeAll", { label: tCat(cat.label) })}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <ul className="col-span-6 grid grid-cols-2 gap-x-8 gap-y-2.5">
                        {cat.subgroups.map((sub) => (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              onClick={() => setOpenCategory(null)}
                              className="inline-block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline underline-offset-4 transition-colors"
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>

                      {cat.featured && (
                        <Link
                          href={cat.featured.href}
                          onClick={() => setOpenCategory(null)}
                          className="col-span-4 group relative isolate flex flex-col justify-end overflow-hidden rounded-xl min-h-[160px] p-5 border border-[var(--border-subtle)]"
                        >
                          <Image
                            src={cat.featured.image}
                            alt={cat.featured.title}
                            fill
                            sizes="320px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] -z-10"
                          />
                          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-black/0" />
                          <span className="text-[10px] font-semibold text-[var(--amber)] tracking-[0.12em] uppercase">
                            {t("featured")}
                          </span>
                          <h4
                            className="mt-1 text-base font-bold text-white leading-tight"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {cat.featured.title}
                          </h4>
                          <p className="mt-1 text-xs text-white/80">
                            {cat.featured.description}
                          </p>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-[68px] overflow-y-auto">
          <div className="px-6 py-6 space-y-2">
            <form action="/marketplace" className="flex items-center h-12 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] mb-6 px-4">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                name="q"
                type="search"
                placeholder={t("searchPlaceholderMobile")}
                className="w-full bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </form>

            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase px-1">
              {t("browseHeading")}
            </p>
            {activeCategoryGroups.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <cat.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                {tCat(cat.label)}
              </Link>
            ))}

            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase px-1 pt-4">
              {t("accountHeading")}
            </p>
            <Link
              href="/messages"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" />
              {t("inbox")}
            </Link>
            <Link
              href="/saved"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <Heart className="w-4 h-4 text-[var(--text-tertiary)]" />
              {t("saved")}
            </Link>

            <div className="pt-6 border-t border-[var(--border-subtle)] mt-6 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase">
                  {t("regionHeading")}
                </span>
                <RegionPicker variant="full" />
              </div>
              <Link
                href="/auth/login"
                className="btn-primary w-full !text-base !py-3.5"
                onClick={() => setMobileOpen(false)}
              >
                <User className="w-4 h-4" />
                {tc("signIn")}
              </Link>
              <Link
                href="/auth/register"
                className="btn-outline w-full !text-base !py-3.5"
                onClick={() => setMobileOpen(false)}
              >
                {t("createAccount")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
