"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { submitBuyerRequest } from "@/lib/actions/buyer-requests";

const COMMODITIES = [
  { value: "coffee", label: "Coffee" },
  { value: "cocoa", label: "Cocoa" },
  { value: "tea", label: "Tea" },
  { value: "spices", label: "Spices" },
  { value: "minerals", label: "Minerals & Metals" },
  { value: "cereals", label: "Cereals & Grains" },
  { value: "specialty", label: "Specialty Crops" },
  { value: "shea", label: "Shea / Natural Oils" },
  { value: "timber", label: "Timber & Wood" },
  { value: "other", label: "Other" },
] as const;

const AFRICAN_COUNTRIES: { region: string; countries: { code: string; name: string }[] }[] = [
  {
    region: "East Africa",
    countries: [
      { code: "ET", name: "Ethiopia" },
      { code: "KE", name: "Kenya" },
      { code: "TZ", name: "Tanzania" },
      { code: "UG", name: "Uganda" },
      { code: "RW", name: "Rwanda" },
      { code: "BI", name: "Burundi" },
      { code: "SO", name: "Somalia" },
      { code: "DJ", name: "Djibouti" },
    ],
  },
  {
    region: "West Africa",
    countries: [
      { code: "NG", name: "Nigeria" },
      { code: "GH", name: "Ghana" },
      { code: "CI", name: "Côte d'Ivoire" },
      { code: "SN", name: "Senegal" },
      { code: "BF", name: "Burkina Faso" },
      { code: "GN", name: "Guinea" },
      { code: "BJ", name: "Benin" },
      { code: "ML", name: "Mali" },
      { code: "TG", name: "Togo" },
      { code: "SL", name: "Sierra Leone" },
    ],
  },
  {
    region: "Central Africa",
    countries: [
      { code: "CD", name: "DR Congo" },
      { code: "CM", name: "Cameroon" },
      { code: "CG", name: "Rep. of Congo" },
      { code: "GA", name: "Gabon" },
      { code: "TD", name: "Chad" },
      { code: "CF", name: "Central African Rep." },
    ],
  },
  {
    region: "Southern Africa",
    countries: [
      { code: "ZA", name: "South Africa" },
      { code: "ZW", name: "Zimbabwe" },
      { code: "ZM", name: "Zambia" },
      { code: "MZ", name: "Mozambique" },
      { code: "MG", name: "Madagascar" },
      { code: "MW", name: "Malawi" },
      { code: "AO", name: "Angola" },
      { code: "NA", name: "Namibia" },
    ],
  },
  {
    region: "North Africa",
    countries: [
      { code: "MA", name: "Morocco" },
      { code: "TN", name: "Tunisia" },
      { code: "EG", name: "Egypt" },
      { code: "SD", name: "Sudan" },
    ],
  },
];

export function ExportRequestForm() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [selectedCommodities, setSelectedCommodities] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    countryCode: "",
  });

  const [other, setOther] = useState({
    volume: "",
    targetPrice: "",
    certifications: "",
    timeline: "",
    notes: "",
  });

  function toggleCommodity(value: string) {
    setSelectedCommodities((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  function toggleCountry(code: string) {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleRegion(region: { countries: { code: string; name: string }[] }) {
    const codes = region.countries.map((c) => c.code);
    const allSelected = codes.every((c) => selectedCountries.has(c));
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  }

  function buildDescription(): string {
    const parts: string[] = [];

    if (selectedCommodities.size > 0) {
      const labels = COMMODITIES.filter((c) => selectedCommodities.has(c.value)).map((c) => c.label);
      parts.push(`Commodities: ${labels.join(", ")}`);
    }

    if (selectedCountries.size > 0) {
      const names = AFRICAN_COUNTRIES.flatMap((r) => r.countries)
        .filter((c) => selectedCountries.has(c.code))
        .map((c) => c.name);
      parts.push(`Source countries: ${names.join(", ")}`);
    }

    if (other.certifications) parts.push(`Certifications required: ${other.certifications}`);
    if (other.notes) parts.push(`Additional notes: ${other.notes}`);

    return parts.join("\n");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (selectedCommodities.size === 0) {
      setSubmitError("Please select at least one commodity.");
      return;
    }
    if (!contact.name || !contact.email) {
      setSubmitError("Name and email are required.");
      return;
    }

    start(async () => {
      const result = await submitBuyerRequest({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        companyName: contact.companyName,
        countryCode: contact.countryCode,
        category: Array.from(selectedCommodities).join(","),
        title: `Export RFQ — ${Array.from(selectedCommodities)
          .map((v) => COMMODITIES.find((c) => c.value === v)?.label ?? v)
          .join(", ")}`,
        description: buildDescription(),
        quantity: other.volume,
        budgetUsd: other.targetPrice,
        timeline: other.timeline,
        locale,
        sourcePath: "/request-export",
      });

      if (!result.success) {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-8 lg:p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-7 h-7 text-[var(--amber-dark)]" />
        </div>
        <h2
          className="text-2xl font-bold text-[var(--obsidian)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Enquiry received.
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Our trade team will review your request and come back to you with matched African suppliers within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Commodities */}
      <Card>
        <SectionHeader
          title="What would you like to source from Africa?"
          subtitle="Select all that apply."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {COMMODITIES.map((c) => {
            const checked = selectedCommodities.has(c.value);
            return (
              <label
                key={c.value}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-colors select-none ${
                  checked
                    ? "border-[var(--obsidian)] bg-[var(--obsidian)]/5 text-[var(--obsidian)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleCommodity(c.value)}
                />
                <span
                  className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    checked ? "bg-[var(--obsidian)] border-[var(--obsidian)]" : "border-[var(--border-default)]"
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium">{c.label}</span>
              </label>
            );
          })}
        </div>
      </Card>

      {/* African countries */}
      <Card>
        <SectionHeader
          title="Preferred source countries"
          subtitle="Leave all unchecked if you have no preference."
        />
        <div className="mt-4 space-y-5">
          {AFRICAN_COUNTRIES.map((region) => {
            const regionCodes = region.countries.map((c) => c.code);
            const allChecked = regionCodes.every((c) => selectedCountries.has(c));
            const someChecked = regionCodes.some((c) => selectedCountries.has(c));
            return (
              <div key={region.region}>
                <label className="flex items-center gap-2 mb-2 cursor-pointer group">
                  <span
                    className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                      allChecked
                        ? "bg-[var(--terracotta)] border-[var(--terracotta)]"
                        : someChecked
                        ? "bg-[var(--terracotta)]/40 border-[var(--terracotta)]"
                        : "border-[var(--border-default)] group-hover:border-[var(--text-tertiary)]"
                    }`}
                    onClick={() => toggleRegion(region)}
                  >
                    {(allChecked || someChecked) && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                        <path d={allChecked ? "M1 4l3 3 5-6" : "M1 4h8"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase"
                    onClick={() => toggleRegion(region)}
                  >
                    {region.region}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pl-1">
                  {region.countries.map((country) => {
                    const checked = selectedCountries.has(country.code);
                    return (
                      <label
                        key={country.code}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleCountry(country.code)}
                        />
                        <span
                          className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-[var(--terracotta)] border-[var(--terracotta)]"
                              : "border-[var(--border-default)] group-hover:border-[var(--text-tertiary)]"
                          }`}
                        >
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          {country.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Other relevant info */}
      <Card>
        <SectionHeader title="Sourcing requirements" subtitle="Optional — helps us match you faster." />
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Volume needed">
              <input
                className="er-input"
                value={other.volume}
                onChange={(e) => setOther((o) => ({ ...o, volume: e.target.value }))}
                placeholder="e.g. 20 MT/month, 1 container"
              />
            </Field>
            <Field label="Target price (USD)">
              <input
                className="er-input"
                value={other.targetPrice}
                onChange={(e) => setOther((o) => ({ ...o, targetPrice: e.target.value }))}
                placeholder="e.g. $4.50/kg, under $300/MT"
              />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Certifications required">
              <input
                className="er-input"
                value={other.certifications}
                onChange={(e) => setOther((o) => ({ ...o, certifications: e.target.value }))}
                placeholder="e.g. Fair Trade, Organic, Rainforest Alliance"
              />
            </Field>
            <Field label="Delivery timeline">
              <input
                className="er-input"
                value={other.timeline}
                onChange={(e) => setOther((o) => ({ ...o, timeline: e.target.value }))}
                placeholder="e.g. within 60 days, Q3 2026"
              />
            </Field>
          </div>
          <Field label="Additional notes">
            <textarea
              className="er-input min-h-[100px]"
              value={other.notes}
              maxLength={2000}
              onChange={(e) => setOther((o) => ({ ...o, notes: e.target.value }))}
              placeholder="Processing method, grade requirements, packaging, port of discharge, or anything else…"
            />
          </Field>
        </div>
      </Card>

      {/* Requestor info */}
      <Card>
        <SectionHeader title="Your contact details" subtitle="We'll reach out with matched suppliers — no spam." />
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Your name" required>
              <input
                className="er-input"
                value={contact.name}
                maxLength={120}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="er-input"
                value={contact.email}
                maxLength={200}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                required
              />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Phone / WhatsApp">
              <input
                className="er-input"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                placeholder="+86 138 0000 0000"
              />
            </Field>
            <Field label="Company">
              <input
                className="er-input"
                value={contact.companyName}
                onChange={(e) => setContact((c) => ({ ...c, companyName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Your country">
            <input
              className="er-input"
              value={contact.countryCode}
              maxLength={8}
              onChange={(e) => setContact((c) => ({ ...c, countryCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. CN, JP, KR, DE"
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-[var(--text-tertiary)] max-w-md">
          By submitting you agree we may contact you about this request. We never share your details with third parties.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[var(--obsidian)] text-[var(--ivory)] font-semibold text-sm hover:bg-[var(--obsidian-light)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Sending…" : "Submit sourcing request"}
        </button>
      </div>

      <style jsx>{`
        .er-input {
          width: 100%;
          background: #fff;
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          font-size: 0.9rem;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .er-input:focus {
          outline: none;
          border-color: var(--obsidian);
          box-shadow: 0 0 0 3px rgba(216, 159, 46, 0.18);
        }
        .er-input::placeholder {
          color: var(--text-tertiary);
        }
      `}</style>
    </form>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 lg:p-8">
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2
        className="text-base font-bold text-[var(--obsidian)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-1.5">
        {label}
        {required && <span className="text-[var(--terracotta)] ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
