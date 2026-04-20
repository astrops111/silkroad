"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  Globe,
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
} from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

const CATEGORY_GROUPS = [
  { label: "All", href: "/marketplace", icon: Package },
  { label: "Electronics", href: "/marketplace?category=electronics", icon: Zap },
  { label: "Machinery", href: "/marketplace?category=machinery", icon: Factory },
  { label: "Textiles", href: "/marketplace?category=textiles", icon: Package },
  { label: "Construction", href: "/marketplace?category=construction", icon: Truck },
  { label: "Coffee", href: "/commodities?category=coffee", icon: Coffee },
  { label: "Cocoa", href: "/commodities?category=cocoa", icon: Leaf },
  { label: "Tea & Spices", href: "/commodities?category=tea", icon: Leaf },
  { label: "Minerals", href: "/commodities?category=minerals", icon: Gem },
  { label: "RFQ", href: "/dashboard/rfq", icon: FileText },
];

export function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "products" | "commodities" | "suppliers">("all");
  const langRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  const TOP_LINKS = [
    { label: t("products"), href: "/marketplace" },
    { label: t("commodities"), href: "/commodities" },
    { label: t("suppliers"), href: "/suppliers" },
    { label: t("rfq"), href: "/dashboard/rfq" },
    { label: t("tradeAssurance"), href: "/trade-assurance" },
  ];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const scopeLabel: Record<typeof scope, string> = {
    all: "All categories",
    products: "Products",
    commodities: "Commodities",
    suppliers: "Suppliers",
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-subtle)]">
        {/* Utility row - small links above main bar */}
        <div className="hidden lg:block border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-9 flex items-center justify-end gap-6 text-[12px] text-[var(--text-tertiary)]">
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">
              About
            </Link>
            <Link href="/how-to-buy" className="hover:text-[var(--text-primary)] transition-colors">
              How to buy
            </Link>
            <Link href="/sell" className="hover:text-[var(--text-primary)] transition-colors">
              Sell on Silk Road
            </Link>
            <Link href="/help" className="hover:text-[var(--text-primary)] transition-colors">
              Help
            </Link>
            <span className="w-px h-3 bg-[var(--border-default)]" />
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                EN · USD
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-[var(--border-subtle)] py-2 animate-scale-in z-10">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => setLangOpen(false)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                placeholder="Search 12,000+ products, suppliers, commodities…"
                className="flex-1 bg-transparent px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="submit"
                aria-label="Search"
                className="h-full px-5 bg-[var(--obsidian)] text-[var(--ivory)] hover:bg-[var(--obsidian-light)] transition-colors flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Utility cluster */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">
              <Link
                href="/messages"
                aria-label="Messages"
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Inbox</span>
              </Link>

              <Link
                href="/saved"
                aria-label="Saved"
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Saved</span>
              </Link>

              <Link
                href="/auth/login"
                aria-label="Account"
                className="hidden md:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{tc("signIn")}</span>
              </Link>

              <Link
                href="/cart"
                aria-label="Cart"
                className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden md:inline text-[10px] mt-0.5">Cart</span>
                <span className="absolute top-0.5 right-1.5 w-4 h-4 bg-[var(--terracotta)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
                className="lg:hidden p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary category strip */}
        <div className="hidden lg:block border-t border-[var(--border-subtle)] bg-white">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
            <div className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-hide">
              {CATEGORY_GROUPS.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </Link>
              ))}
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
                placeholder="Search products, suppliers..."
                className="w-full bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </form>

            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase px-1">
              Browse
            </p>
            {CATEGORY_GROUPS.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <cat.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                {cat.label}
              </Link>
            ))}

            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase px-1 pt-4">
              Account
            </p>
            <Link
              href="/messages"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" />
              Inbox
            </Link>
            <Link
              href="/saved"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <Heart className="w-4 h-4 text-[var(--text-tertiary)]" />
              Saved
            </Link>

            <div className="pt-6 border-t border-[var(--border-subtle)] mt-6 space-y-3">
              <Link
                href="/auth/login"
                className="btn-primary w-full !text-base !py-3.5"
                onClick={() => setMobileOpen(false)}
              >
                <User className="w-4 h-4" />
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="btn-outline w-full !text-base !py-3.5"
                onClick={() => setMobileOpen(false)}
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
