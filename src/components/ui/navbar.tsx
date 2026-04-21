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
  Sparkles,
  Smartphone,
  ShoppingBasket,
  Baby,
  BedDouble,
  Sofa,
  FileText,
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
   t("nav.categoryX") at render time below. Subgroup labels are kept
   literal; they render as-is. */
const PRODUCT_CATEGORIES: CategoryGroup[] = [
  { label: "All", href: "/marketplace", icon: Package },
  {
    label: "Cosmetics",
    href: "/marketplace?category=cosmetics",
    icon: Sparkles,
    subgroups: [
      { label: "Skincare", href: "/marketplace?category=cosmetics&sub=skincare" },
      { label: "Haircare & Wigs", href: "/marketplace?category=cosmetics&sub=haircare" },
      { label: "Makeup", href: "/marketplace?category=cosmetics&sub=makeup" },
      { label: "Fragrance", href: "/marketplace?category=cosmetics&sub=fragrance" },
      { label: "Nail Care", href: "/marketplace?category=cosmetics&sub=nail" },
      { label: "Personal Hygiene", href: "/marketplace?category=cosmetics&sub=hygiene" },
      { label: "Beauty Tools & Devices", href: "/marketplace?category=cosmetics&sub=tools" },
      { label: "Cosmetic Packaging (OEM)", href: "/marketplace?category=cosmetics&sub=packaging" },
    ],
    featured: {
      title: "Human-hair wigs OEM",
      description: "MOQ 50 units · From $18",
      image:
        "https://images.pexels.com/photos/3762871/pexels-photo-3762871.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=cosmetics&promo=wigs",
    },
  },
  {
    label: "Consumer Electronics",
    href: "/marketplace?category=electronics",
    icon: Smartphone,
    subgroups: [
      { label: "Mobile Phones & Accessories", href: "/marketplace?category=electronics&sub=phones" },
      { label: "Audio (speakers, earbuds)", href: "/marketplace?category=electronics&sub=audio" },
      { label: "TVs & Displays", href: "/marketplace?category=electronics&sub=tvs" },
      { label: "Small Appliances", href: "/marketplace?category=electronics&sub=appliances" },
      { label: "Computing & Tablets", href: "/marketplace?category=electronics&sub=computing" },
      { label: "Chargers & Power Banks", href: "/marketplace?category=electronics&sub=power" },
      { label: "LED & Solar Lighting", href: "/marketplace?category=electronics&sub=lighting" },
      { label: "Security & Cameras", href: "/marketplace?category=electronics&sub=security" },
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
    label: "Groceries",
    href: "/marketplace?category=groceries",
    icon: ShoppingBasket,
    subgroups: [
      { label: "Rice & Grains", href: "/marketplace?category=groceries&sub=grains" },
      { label: "Cooking Oil", href: "/marketplace?category=groceries&sub=oil" },
      { label: "Instant Noodles", href: "/marketplace?category=groceries&sub=noodles" },
      { label: "Canned & Packaged Foods", href: "/marketplace?category=groceries&sub=canned" },
      { label: "Beverages", href: "/marketplace?category=groceries&sub=beverages" },
      { label: "Snacks & Confectionery", href: "/marketplace?category=groceries&sub=snacks" },
      { label: "Condiments & Sauces", href: "/marketplace?category=groceries&sub=condiments" },
      { label: "Sugar, Salt & Dry Goods", href: "/marketplace?category=groceries&sub=dry" },
    ],
    featured: {
      title: "Instant noodles private label",
      description: "MOQ 1 pallet · From $0.18/pack",
      image:
        "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=groceries&promo=noodles",
    },
  },
  {
    label: "Baby Products",
    href: "/marketplace?category=baby",
    icon: Baby,
    subgroups: [
      { label: "Diapers", href: "/marketplace?category=baby&sub=diapers" },
      { label: "Wipes", href: "/marketplace?category=baby&sub=wipes" },
      { label: "Formula & Baby Food", href: "/marketplace?category=baby&sub=food" },
      { label: "Feeding (bottles, bibs)", href: "/marketplace?category=baby&sub=feeding" },
      { label: "Baby Clothing", href: "/marketplace?category=baby&sub=clothing" },
      { label: "Strollers & Car Seats", href: "/marketplace?category=baby&sub=strollers" },
      { label: "Toys (0–3, 3–6)", href: "/marketplace?category=baby&sub=toys" },
      { label: "Bath & Skincare", href: "/marketplace?category=baby&sub=bath" },
    ],
    featured: {
      title: "OEM ultra-absorbent diapers",
      description: "MOQ 10 cartons · From $4.20/pack",
      image:
        "https://images.pexels.com/photos/3933250/pexels-photo-3933250.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=baby&promo=diapers",
    },
  },
  {
    label: "Hotel Interiors",
    href: "/marketplace?category=hotel",
    icon: BedDouble,
    subgroups: [
      { label: "Guestroom Furniture", href: "/marketplace?category=hotel&sub=guestroom" },
      { label: "Bathroom Fixtures", href: "/marketplace?category=hotel&sub=bathroom" },
      { label: "Lighting & Chandeliers", href: "/marketplace?category=hotel&sub=lighting" },
      { label: "Bedding & Towels", href: "/marketplace?category=hotel&sub=bedding" },
      { label: "Curtains & Drapes", href: "/marketplace?category=hotel&sub=curtains" },
      { label: "Decor & Mirrors", href: "/marketplace?category=hotel&sub=decor" },
      { label: "Lobby / Reception", href: "/marketplace?category=hotel&sub=lobby" },
      { label: "F&B Equipment", href: "/marketplace?category=hotel&sub=fb" },
    ],
    featured: {
      title: "4-star guestroom set",
      description: "Full room · From $1,280",
      image:
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=hotel&promo=guestroom",
    },
  },
  {
    label: "Furniture",
    href: "/marketplace?category=furniture",
    icon: Sofa,
    subgroups: [
      { label: "Living Room", href: "/marketplace?category=furniture&sub=living" },
      { label: "Bedroom", href: "/marketplace?category=furniture&sub=bedroom" },
      { label: "Dining", href: "/marketplace?category=furniture&sub=dining" },
      { label: "Office", href: "/marketplace?category=furniture&sub=office" },
      { label: "Outdoor / Garden", href: "/marketplace?category=furniture&sub=outdoor" },
      { label: "Kids'", href: "/marketplace?category=furniture&sub=kids" },
      { label: "Storage & Shelving", href: "/marketplace?category=furniture&sub=storage" },
      { label: "Commercial / Retail", href: "/marketplace?category=furniture&sub=commercial" },
    ],
    featured: {
      title: "Modular 3-seat fabric sofa",
      description: "MOQ 10 sets · From $320",
      image:
        "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=furniture&promo=sofa",
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
    Cosmetics: "categoryCosmetics",
    "Consumer Electronics": "categoryConsumerElectronics",
    Groceries: "categoryGroceries",
    "Baby Products": "categoryBabyProducts",
    "Hotel Interiors": "categoryHotelInteriors",
    Furniture: "categoryFurniture",
    RFQ: "rfq",
  };
  const tCat = (label: string) =>
    labelKeyMap[label] ? t(labelKeyMap[label]) : label;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "products">("all");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const categoryStripRef = useRef<HTMLDivElement>(null);

  const activeCategoryGroups: CategoryGroup[] = PRODUCT_CATEGORIES;

  const TOP_LINKS = [
    { label: t("products"), href: "/marketplace" },
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

            {/* Search bar — IKEA-style: scope + input + button */}
            <form
              action="/marketplace"
              className="hidden md:flex flex-1 max-w-[760px] h-12 rounded-full border border-[var(--border-default)] hover:border-[var(--text-tertiary)] focus-within:border-[var(--obsidian)] focus-within:shadow-[0_0_0_3px_rgba(216,159,46,0.15)] bg-white transition-all overflow-hidden"
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
                    {(["all", "products"] as const).map((s) => (
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
