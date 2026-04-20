"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/* ---------- Types ---------- */
export interface SearchFilterParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
  maxMoq?: number;
  country?: string[];
  tradeTerms?: string[];
  verified?: boolean;
  sort?: string;
}

interface FilterOption {
  value: string;
  label: string;
  flag?: string; // emoji flag for countries
}

export interface SearchFiltersProps {
  onSearch: (params: SearchFilterParams) => void;
  filters: {
    categories: FilterOption[];
    countries: FilterOption[];
  };
}

/* ---------- Collapsible Section ---------- */
function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="border-b py-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
      >
        {title}
        {open ? (
          <ChevronUp className="size-4" style={{ color: "var(--text-tertiary)" }} />
        ) : (
          <ChevronDown className="size-4" style={{ color: "var(--text-tertiary)" }} />
        )}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

/* ---------- Sort options ---------- */
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price Low \u2192 High" },
  { value: "price_desc", label: "Price High \u2192 Low" },
  { value: "newest", label: "Newest" },
  { value: "moq_asc", label: "MOQ Low \u2192 High" },
];

const TRADE_TERMS = ["FOB", "CIF", "EXW"];

/* ---------- Main Component ---------- */
export default function SearchFilters({ onSearch, filters }: SearchFiltersProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minMoq, setMinMoq] = useState("");
  const [maxMoq, setMaxMoq] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedTradeTerms, setSelectedTradeTerms] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [mobileOpen, setMobileOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback((): SearchFilterParams => {
    const params: SearchFilterParams = {};
    if (query) params.q = query;
    if (category) params.category = category;
    if (minPrice) params.minPrice = Number(minPrice);
    if (maxPrice) params.maxPrice = Number(maxPrice);
    if (minMoq) params.minMoq = Number(minMoq);
    if (maxMoq) params.maxMoq = Number(maxMoq);
    if (selectedCountries.length > 0) params.country = selectedCountries;
    if (selectedTradeTerms.length > 0) params.tradeTerms = selectedTradeTerms;
    if (verifiedOnly) params.verified = true;
    if (sort !== "relevance") params.sort = sort;
    return params;
  }, [query, category, minPrice, maxPrice, minMoq, maxMoq, selectedCountries, selectedTradeTerms, verifiedOnly, sort]);

  const emitSearch = useCallback(() => {
    onSearch(buildParams());
  }, [onSearch, buildParams]);

  /* Debounced search on any filter change */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(emitSearch, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [emitSearch]);

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setMinMoq("");
    setMaxMoq("");
    setSelectedCountries([]);
    setSelectedTradeTerms([]);
    setVerifiedOnly(false);
    setSort("relevance");
  };

  const toggleCountry = (val: string) =>
    setSelectedCountries((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );

  const toggleTradeTerm = (val: string) =>
    setSelectedTradeTerms((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );

  const hasActiveFilters =
    !!query || !!category || !!minPrice || !!maxPrice || !!minMoq || !!maxMoq ||
    selectedCountries.length > 0 || selectedTradeTerms.length > 0 || verifiedOnly || sort !== "relevance";

  /* ---------- Shared filter body ---------- */
  const filterBody = (
    <div className="flex flex-col gap-0">
      {/* Search input */}
      <div className="px-4 pb-4">
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors focus-within:border-amber"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--surface-primary)",
          }}
        >
          <Search className="size-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            style={{ fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X className="size-3.5" style={{ color: "var(--text-tertiary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 pb-2">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          Sort by
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--surface-primary)",
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-y-auto px-4" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {/* Category */}
        <FilterSection title="Category">
          <div className="space-y-1.5">
            {filters.categories.map((cat) => (
              <label
                key={cat.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={category === cat.value}
                  onChange={() => setCategory(cat.value === category ? "" : cat.value)}
                  className="accent-[var(--amber)]"
                />
                <span style={{ color: "var(--text-primary)" }}>{cat.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="Price Range">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>to</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </FilterSection>

        {/* MOQ Range */}
        <FilterSection title="MOQ Range">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minMoq}
              onChange={(e) => setMinMoq(e.target.value)}
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>to</span>
            <input
              type="number"
              placeholder="Max"
              value={maxMoq}
              onChange={(e) => setMaxMoq(e.target.value)}
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </FilterSection>

        {/* Supplier Country */}
        <FilterSection title="Supplier Country">
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filters.countries.map((country) => (
              <label
                key={country.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
              >
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(country.value)}
                  onChange={() => toggleCountry(country.value)}
                  className="accent-[var(--amber)]"
                />
                {country.flag && <span className="text-base">{country.flag}</span>}
                <span style={{ color: "var(--text-primary)" }}>{country.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Trade Terms */}
        <FilterSection title="Trade Terms" defaultOpen={false}>
          <div className="space-y-1.5">
            {TRADE_TERMS.map((term) => (
              <label
                key={term}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
              >
                <input
                  type="checkbox"
                  checked={selectedTradeTerms.includes(term)}
                  onChange={() => toggleTradeTerm(term)}
                  className="accent-[var(--amber)]"
                />
                <span style={{ color: "var(--text-primary)" }}>{term}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Verified Suppliers Only */}
        <div
          className="flex items-center justify-between py-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" style={{ color: "var(--amber)" }} />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Verified Suppliers Only
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={verifiedOnly}
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
            style={{
              background: verifiedOnly ? "var(--amber)" : "var(--border-default)",
            }}
          >
            <span
              className="pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform"
              style={{
                transform: verifiedOnly ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={clearFilters}
            className="btn-outline flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <X className="size-3.5" />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block w-72 shrink-0 rounded-xl border"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--surface-primary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SlidersHorizontal className="size-4" style={{ color: "var(--amber)" }} />
          <h2
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Filters
          </h2>
          {hasActiveFilters && (
            <span
              className="ml-auto inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "var(--amber)" }}
            >
              !
            </span>
          )}
        </div>
        {filterBody}
      </aside>

      {/* Mobile trigger + drawer */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="btn-outline inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {hasActiveFilters && (
                <span
                  className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: "var(--amber)" }}
                >
                  !
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle
                className="flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <SlidersHorizontal className="size-4" style={{ color: "var(--amber)" }} />
                Filters
              </SheetTitle>
            </SheetHeader>
            {filterBody}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
