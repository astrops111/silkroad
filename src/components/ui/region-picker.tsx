"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { setUserLocale } from "@/i18n/set-locale";
import { useRegion } from "@/lib/providers/region-provider";
import type { Locale } from "@/i18n/routing";

type Country = { code: string; name: string; flag: string; defaultLang: string; defaultCurrency: string };
type Language = { code: string; label: string; native: string };
type Currency = { code: string; name: string; symbol: string };

const COUNTRIES: Country[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", defaultLang: "en", defaultCurrency: "NGN" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", defaultLang: "sw", defaultCurrency: "KES" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", defaultLang: "en", defaultCurrency: "RWF" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", defaultLang: "en", defaultCurrency: "ETB" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", defaultLang: "sw", defaultCurrency: "TZS" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", defaultLang: "en", defaultCurrency: "GHS" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", defaultLang: "en", defaultCurrency: "ZAR" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", defaultLang: "fr", defaultCurrency: "XOF" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", defaultLang: "fr", defaultCurrency: "XOF" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", defaultLang: "en", defaultCurrency: "UGX" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", defaultLang: "ar", defaultCurrency: "EGP" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", defaultLang: "fr", defaultCurrency: "MAD" },
  { code: "CN", name: "China", flag: "🇨🇳", defaultLang: "zh", defaultCurrency: "CNY" },
  { code: "US", name: "United States", flag: "🇺🇸", defaultLang: "en", defaultCurrency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", defaultLang: "en", defaultCurrency: "GBP" },
  { code: "EU", name: "Eurozone", flag: "🇪🇺", defaultLang: "en", defaultCurrency: "EUR" },
];

const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "fr", label: "French", native: "Français" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH" },
  { code: "XOF", name: "West African CFA", symbol: "CFA" },
];

type Variant = "compact" | "full";

export function RegionPicker({ variant = "compact" }: { variant?: Variant }) {
  const router = useRouter();
  const activeLocale = useLocale();
  const region = useRegion();
  const t = useTranslations("marketing.regionPicker");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const country =
    COUNTRIES.find((c) => c.code === region.country) ?? COUNTRIES[0];
  const currency =
    CURRENCIES.find((c) => c.code === region.currency) ?? CURRENCIES[0];
  const language =
    LANGUAGES.find((l) => l.code === activeLocale) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const applyLocale = (code: string) => {
    if (!LANGUAGES.find((l) => l.code === code)) return;
    startTransition(async () => {
      await setUserLocale(code as Locale);
      router.refresh();
    });
  };

  const onCountrySelect = (c: Country) => {
    region.setCountry(c.code);
    region.setCurrency(c.defaultCurrency);
    applyLocale(c.defaultLang);
  };

  const onLanguageSelect = (l: Language) => {
    applyLocale(l.code);
  };

  const onCurrencySelect = (cu: Currency) => {
    region.setCurrency(cu.code);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          variant === "compact"
            ? "flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            : "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
        }
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Globe className="w-3.5 h-3.5" />
        )}
        <span className="font-semibold">{country.flag}</span>
        <span>
          {language.code.toUpperCase()} · {currency.code}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Region, language and currency"
          className="absolute right-0 top-full mt-2 w-[360px] sm:w-[480px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-scale-in"
        >
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
            <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-tertiary)]">
              {t("regionHeading")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-primary)]">
              {t("shippingTo")}{" "}
              <span className="font-semibold">
                {country.flag} {country.name}
              </span>{" "}
              · {language.native} · {currency.symbol} {currency.code}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-0 sm:divide-x divide-[var(--border-subtle)]">
            <Section title={t("country")}>
              <ul className="max-h-72 overflow-y-auto py-1">
                {COUNTRIES.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onCountrySelect(c);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        c.code === country.code
                          ? "bg-[var(--amber)]/10 text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.code === country.code && (
                        <Check className="w-3.5 h-3.5 text-[var(--amber-dark)] shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t("language")}>
              <ul className="max-h-72 overflow-y-auto py-1">
                {LANGUAGES.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => onLanguageSelect(l)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        l.code === language.code
                          ? "bg-[var(--amber)]/10 text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="flex-1 truncate">{l.native}</span>
                      <span className="text-[10px] uppercase text-[var(--text-tertiary)]">
                        {l.code}
                      </span>
                      {l.code === language.code && (
                        <Check className="w-3.5 h-3.5 text-[var(--amber-dark)] shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t("currency")}>
              <ul className="max-h-72 overflow-y-auto py-1">
                {CURRENCIES.map((cu) => (
                  <li key={cu.code}>
                    <button
                      type="button"
                      onClick={() => onCurrencySelect(cu)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        cu.code === currency.code
                          ? "bg-[var(--amber)]/10 text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="w-7 text-[var(--text-tertiary)] text-xs">
                        {cu.symbol}
                      </span>
                      <span className="flex-1 truncate">{cu.code}</span>
                      {cu.code === currency.code && (
                        <Check className="w-3.5 h-3.5 text-[var(--amber-dark)] shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">
              {t("footer")}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-[var(--obsidian)] text-[var(--ivory)] text-xs font-semibold hover:bg-[var(--obsidian-light)] transition-colors"
            >
              {t("done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)]">
        {title}
      </div>
      {children}
    </div>
  );
}
