"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { submitBuyerRequest } from "@/lib/actions/buyer-requests";

const CATEGORY_KEYS = [
  "home",
  "hotels",
  "consumerElectronics",
  "beauty",
  "groceries",
  "babyProducts",
  "other",
] as const;

export function BuyerRequestForm() {
  const t = useTranslations("buyerRequest");
  const locale = useLocale();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    countryCode: "",
    category: "",
    title: "",
    description: "",
    quantity: "",
    budgetUsd: "",
    timeline: "",
  });

  function setField<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await submitBuyerRequest({
        ...form,
        locale,
        sourcePath: pathname ?? undefined,
      });
      if (!result.success) {
        setError(result.error ?? t("errorGeneric"));
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
          {t("successTitle")}
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          {t("successBody")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 lg:p-10 space-y-6"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <Section title={t("sectionWhatTitle")} subtitle={t("sectionWhatSubtitle")}>
        <Field label={t("title")} required>
          <input
            className="br-input"
            value={form.title}
            maxLength={200}
            onChange={(e) => setField("title", e.target.value)}
            placeholder={t("titlePlaceholder")}
            required
          />
        </Field>

        <Field label={t("description")} required>
          <textarea
            className="br-input min-h-[140px]"
            value={form.description}
            maxLength={4000}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            required
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("category")}>
            <select
              className="br-input"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
            >
              <option value="">{t("categoryAny")}</option>
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`categories.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("quantity")}>
            <input
              className="br-input"
              value={form.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
              placeholder={t("quantityPlaceholder")}
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("budget")}>
            <input
              className="br-input"
              value={form.budgetUsd}
              onChange={(e) => setField("budgetUsd", e.target.value)}
              placeholder={t("budgetPlaceholder")}
            />
          </Field>
          <Field label={t("timeline")}>
            <input
              className="br-input"
              value={form.timeline}
              onChange={(e) => setField("timeline", e.target.value)}
              placeholder={t("timelinePlaceholder")}
            />
          </Field>
        </div>
      </Section>

      <Section title={t("sectionWhoTitle")} subtitle={t("sectionWhoSubtitle")}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("name")} required>
            <input
              className="br-input"
              value={form.name}
              maxLength={120}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </Field>
          <Field label={t("email")} required>
            <input
              type="email"
              className="br-input"
              value={form.email}
              maxLength={200}
              onChange={(e) => setField("email", e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("phone")}>
            <input
              className="br-input"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+254 700 000 000"
            />
          </Field>
          <Field label={t("company")}>
            <input
              className="br-input"
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
            />
          </Field>
        </div>

        <Field label={t("country")}>
          <input
            className="br-input"
            value={form.countryCode}
            maxLength={8}
            onChange={(e) => setField("countryCode", e.target.value.toUpperCase())}
            placeholder={t("countryPlaceholder")}
          />
        </Field>
      </Section>

      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        <p className="text-xs text-[var(--text-tertiary)] max-w-md">
          {t("footnote")}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-[var(--obsidian)] text-[var(--ivory)] font-semibold text-sm hover:bg-[var(--obsidian-light)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>

      <style jsx>{`
        .br-input {
          width: 100%;
          background: #fff;
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          font-size: 0.9rem;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .br-input:focus {
          outline: none;
          border-color: var(--obsidian);
          box-shadow: 0 0 0 3px rgba(216, 159, 46, 0.18);
        }
        .br-input::placeholder {
          color: var(--text-tertiary);
        }
      `}</style>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-base font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
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
