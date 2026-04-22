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
  Hotel,
  House,
  FileText,
  ArrowRight,
  Megaphone,
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
    label: "Home",
    href: "/marketplace?category=home",
    icon: House,
    subgroups: [
      { label: "Decor", href: "/marketplace?category=home&sub=home-decor" },
      { label: "Furniture", href: "/marketplace?category=home&sub=home-furniture" },
      { label: "Supplies", href: "/marketplace?category=home&sub=home-supplies" },
      { label: "Fragrance", href: "/marketplace?category=home&sub=home-fragrance" },
      { label: "Kitchen", href: "/marketplace?category=home&sub=home-kitchen" },
      { label: "Bedroom", href: "/marketplace?category=home&sub=home-bedroom" },
      { label: "Bathroom", href: "/marketplace?category=home&sub=home-bathroom" },
      { label: "Outdoors", href: "/marketplace?category=home&sub=home-outdoors" },
    ],
    featured: {
      title: "Modular 3-seat fabric sofa",
      description: "MOQ 10 sets · From $320",
      image:
        "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=home&sub=home-furniture",
    },
  },
  {
    label: "Hotels",
    href: "/marketplace?category=hotels",
    icon: Hotel,
    subgroups: [
      { label: "Bath", href: "/marketplace?category=hotels&sub=hotel-bath" },
      { label: "Beds", href: "/marketplace?category=hotels&sub=hotel-beds" },
      { label: "Furnishing", href: "/marketplace?category=hotels&sub=hotel-furnishing" },
      { label: "Decor", href: "/marketplace?category=hotels&sub=hotel-decor" },
    ],
    featured: {
      title: "4-star guestroom set",
      description: "Full room · From $1,280",
      image:
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=hotels&sub=hotel-beds",
    },
  },
  {
    label: "Consumer Electronics",
    href: "/marketplace?category=consumer-electronics",
    icon: Smartphone,
    subgroups: [
      { label: "Home Appliance", href: "/marketplace?category=consumer-electronics&sub=home-appliance" },
      { label: "Computer", href: "/marketplace?category=consumer-electronics&sub=computer" },
      { label: "Computer Peripherals", href: "/marketplace?category=consumer-electronics&sub=computer-peripherals" },
    ],
    featured: {
      title: "5G smartphone OEM bulk",
      description: "MOQ 100 units · From $85",
      image:
        "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=consumer-electronics&sub=computer",
    },
  },
  {
    label: "Beauty",
    href: "/marketplace?category=beauty",
    icon: Sparkles,
    subgroups: [
      { label: "Facial", href: "/marketplace?category=beauty&sub=beauty-facial" },
      { label: "Body", href: "/marketplace?category=beauty&sub=beauty-body" },
      { label: "Hair", href: "/marketplace?category=beauty&sub=beauty-hair" },
      { label: "Tools", href: "/marketplace?category=beauty&sub=beauty-tools" },
    ],
    featured: {
      title: "Hair care private label",
      description: "MOQ 500 units · From $2.10",
      image:
        "https://images.pexels.com/photos/3762871/pexels-photo-3762871.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=beauty&sub=beauty-hair",
    },
  },
  {
    label: "Groceries",
    href: "/marketplace?category=groceries",
    icon: ShoppingBasket,
    subgroups: [
      { label: "Snacks — Sweets", href: "/marketplace?category=groceries&sub=snacks-sweets" },
      { label: "Snacks — Salty & Savoury", href: "/marketplace?category=groceries&sub=snacks-savoury" },
      { label: "Drink", href: "/marketplace?category=groceries&sub=drink" },
      { label: "Canned Goods", href: "/marketplace?category=groceries&sub=canned-goods" },
      { label: "Frozen", href: "/marketplace?category=groceries&sub=frozen" },
    ],
    featured: {
      title: "Instant noodles private label",
      description: "MOQ 1 pallet · From $0.18/pack",
      image:
        "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=groceries&sub=snacks-savoury",
    },
  },
  {
    label: "Baby Products",
    href: "/marketplace?category=baby-products",
    icon: Baby,
    subgroups: [
      { label: "Diapers", href: "/marketplace?category=baby-products&sub=diapers" },
      { label: "Baby Formula", href: "/marketplace?category=baby-products&sub=baby-formula" },
    ],
    featured: {
      title: "OEM ultra-absorbent diapers",
      description: "MOQ 10 cartons · From $4.20/pack",
      image:
        "https://images.pexels.com/photos/3933250/pexels-photo-3933250.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/marketplace?category=baby-products&sub=diapers",
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
    Home: "categoryHome",
    Hotels: "categoryHotels",
    "Consumer Electronics": "categoryConsumerElectronics",
    Beauty: "categoryBeauty",
    Groceries: "categoryGroceries",
    "Baby Products": "categoryBabyProducts",
    RFQ: "rfq",
  };
  const tCat = (label: string) =>
    labelKeyMap[label] ? t(labelKeyMap[label]) : label;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<string>("all");
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

  // Scope options for the search bar — first entry is "all" (no filter),
  // then one per top-level category (slugs match DB).
  const SCOPE_OPTIONS: { value: string; labelKey: string }[] = [
    { value: "all", labelKey: "scopeAll" },
    { value: "home", labelKey: "categoryHome" },
    { value: "hotels", labelKey: "categoryHotels" },
    { value: "consumer-electronics", labelKey: "categoryConsumerElectronics" },
    { value: "beauty", labelKey: "categoryBeauty" },
    { value: "groceries", labelKey: "categoryGroceries" },
    { value: "baby-products", labelKey: "categoryBabyProducts" },
  ];
  const scopeLabelFor = (value: string) => {
    const opt = SCOPE_OPTIONS.find((o) => o.value === value);
    return opt ? t(opt.labelKey) : t("scopeAll");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-subtle)]">
        {/* Mobile-only request banner (on lg+ it lives in the utility row below) */}
        <Link
          href="/request"
          className="lg:hidden group flex items-center justify-center gap-2 h-9 px-4 bg-gradient-to-r from-[var(--obsidian)] via-[var(--obsidian-light)] to-[var(--obsidian)] text-[var(--ivory)] text-[12px] sm:text-[13px] font-medium hover:brightness-110 transition-[filter]"
        >
          <Megaphone className="w-3.5 h-3.5 text-[var(--amber)] shrink-0" />
          <span className="truncate">{t("bannerLead")}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--amber)] underline-offset-4 group-hover:underline whitespace-nowrap">
            {t("bannerCta")}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* Utility row — request banner on the left, utility links on the right */}
        <div className="hidden lg:block border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-9 flex items-center justify-between gap-6 text-[12px] text-[var(--text-tertiary)]">
            <Link
              href="/request"
              className="group inline-flex items-center gap-2 min-w-0 hover:text-[var(--text-primary)] transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5 text-[var(--amber)] shrink-0" />
              <span className="truncate">{t("bannerLead")}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--amber-dark)] underline-offset-4 group-hover:underline whitespace-nowrap">
                {t("bannerCta")}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <div className="flex items-center gap-6 shrink-0">
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
        </div>

        {/* Main bar */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-4 lg:gap-6 h-[68px]">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 group">
              <div className="flex flex-col">
                <span
                  className="text-[16px] font-bold tracking-tight leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="text-[var(--terracotta)]">Silk</span>{" "}
                  <span className="text-[var(--text-primary)]">Road</span>
                </span>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase leading-none mt-1 text-[var(--amber-dark)]">
                  Africa
                </span>
              </div>
            </Link>

            {/* Search bar — IKEA-style: scope + input + button */}
            <form
              action="/marketplace"
              className="hidden md:flex flex-1 max-w-[760px] h-12 rounded-full border border-[var(--border-default)] hover:border-[var(--text-tertiary)] focus-within:border-[var(--obsidian)] focus-within:shadow-[0_0_0_3px_rgba(216,159,46,0.15)] bg-white transition-all"
            >
              {/* Scope selector */}
              <div className="relative" ref={scopeRef}>
                <button
                  type="button"
                  onClick={() => setScopeOpen(!scopeOpen)}
                  className="h-full pl-5 pr-3 flex items-center gap-1.5 rounded-l-full text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-r border-[var(--border-subtle)]"
                >
                  {scopeLabelFor(scope)}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {scopeOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[var(--border-subtle)] py-2 animate-scale-in z-10 max-h-80 overflow-y-auto">
                    {SCOPE_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => {
                          setScope(opt.value);
                          setScopeOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          scope === opt.value
                            ? "bg-[var(--amber)]/10 text-[var(--amber-dark)] font-semibold"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {scope !== "all" && (
                <input type="hidden" name="category" value={scope} />
              )}
              <input
                type="search"
                name="q"
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="submit"
                aria-label={t("searchButton")}
                className="h-full px-5 rounded-r-full bg-[var(--obsidian)] text-[var(--ivory)] hover:bg-[var(--obsidian-light)] transition-colors flex items-center justify-center"
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
                href="/auth/login"
                aria-label={tc("signIn")}
                className="md:hidden p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <User className="w-5 h-5" />
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
        <div className="fixed inset-0 z-40 bg-white pt-[104px] overflow-y-auto">
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
