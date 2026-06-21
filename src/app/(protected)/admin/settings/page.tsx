"use client";

import { useState } from "react";
import {
  Settings,
  Percent,
  CreditCard,
  Globe,
  Bell,
  Save,
  CheckCircle2,
  Smartphone,
  Building,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PlatformSettings {
  commissionRate: number;
  minOrderValue: number;
  maxOrderValue: number;
  quoteTtlDays: number;
  disputeWindowDays: number;
  defaultCurrency: string;
  supportedCurrencies: string[];
  gateways: Record<string, boolean>;
  notifyOnNewOrder: boolean;
  notifyOnDispute: boolean;
  notifyOnPaymentFail: boolean;
  notifyOnSupplierApply: boolean;
  maintenanceMode: boolean;
}

const DEFAULTS: PlatformSettings = {
  commissionRate: 8,
  minOrderValue: 100,
  maxOrderValue: 500000,
  quoteTtlDays: 14,
  disputeWindowDays: 30,
  defaultCurrency: "USD",
  supportedCurrencies: ["USD", "EUR", "GBP", "CNY", "KES", "NGN", "GHS", "UGX", "TZS", "RWF"],
  gateways: {
    stripe: true,
    flutterwave: true,
    mtn_momo: true,
    airtel_money: true,
    mpesa: true,
    wechat_pay: false,
    alipay: false,
    xtransfer: true,
    bank_transfer: true,
  },
  notifyOnNewOrder: true,
  notifyOnDispute: true,
  notifyOnPaymentFail: true,
  notifyOnSupplierApply: true,
  maintenanceMode: false,
};

const GATEWAY_META: Record<string, { label: string; icon: typeof CreditCard; region: string }> = {
  stripe: { label: "Stripe", icon: CreditCard, region: "Global" },
  flutterwave: { label: "Flutterwave", icon: CreditCard, region: "Africa" },
  mtn_momo: { label: "MTN Mobile Money", icon: Smartphone, region: "W/E Africa" },
  airtel_money: { label: "Airtel Money", icon: Smartphone, region: "E/C Africa" },
  mpesa: { label: "M-Pesa", icon: Smartphone, region: "Kenya / TZ" },
  wechat_pay: { label: "WeChat Pay", icon: Smartphone, region: "China" },
  alipay: { label: "Alipay", icon: CreditCard, region: "China" },
  xtransfer: { label: "XTransfer", icon: Building, region: "Cross-border" },
  bank_transfer: { label: "Bank Transfer", icon: Building, region: "Global" },
};

const ALL_CURRENCIES = ["USD", "EUR", "GBP", "CNY", "KES", "NGN", "GHS", "UGX", "TZS", "RWF", "ETB", "EGP", "ZAR"];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function Section({ title, icon: Icon, children }: { title: string; icon: typeof Settings; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <Icon className="w-4 h-4" style={{ color: "var(--amber)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border-subtle)" }} />;
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ background: checked ? "var(--amber)" : "var(--border-default)" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(4px)" }}
      />
    </button>
  );
}

function NumInput({ value, onChange, min, max, prefix, suffix }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
      {prefix && (
        <span className="px-3 py-2 text-sm border-r" style={{ color: "var(--text-tertiary)", borderColor: "var(--border-subtle)" }}>{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 px-3 py-2 text-sm bg-transparent outline-none text-right"
        style={{ color: "var(--text-primary)" }}
      />
      {suffix && (
        <span className="px-3 py-2 text-sm border-l" style={{ color: "var(--text-tertiary)", borderColor: "var(--border-subtle)" }}>{suffix}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminSettingsPage() {
  const [s, setS] = useState<PlatformSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function patch<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setGateway(key: string, enabled: boolean) {
    setS((prev) => ({ ...prev, gateways: { ...prev.gateways, [key]: enabled } }));
    setSaved(false);
  }

  function toggleCurrency(c: string) {
    if (c === s.defaultCurrency) return;
    patch(
      "supportedCurrencies",
      s.supportedCurrencies.includes(c)
        ? s.supportedCurrencies.filter((x) => x !== c)
        : [...s.supportedCurrencies, c]
    );
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Platform Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Commission rates, payment gateways, currencies, and notifications
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: saved ? "color-mix(in srgb, var(--success) 15%, transparent)" : "var(--amber)",
            color: saved ? "var(--success)" : "var(--obsidian)",
            border: saved ? "1px solid color-mix(in srgb, var(--success) 30%, transparent)" : "none",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      {s.maintenanceMode && (
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold"
          style={{
            background: "color-mix(in srgb, var(--danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
            color: "var(--danger)",
          }}
        >
          ⚠ Platform is in maintenance mode — buyers cannot place orders
        </div>
      )}

      {/* Commission & Limits */}
      <Section title="Commission & Order Limits" icon={Percent}>
        <FieldRow label="Platform commission rate" hint="Applied to gross sales on each settled order">
          <NumInput value={s.commissionRate} onChange={(v) => patch("commissionRate", v)} min={0} max={50} suffix="%" />
        </FieldRow>
        <Divider />
        <FieldRow label="Minimum order value" hint="Orders below this amount are rejected at checkout">
          <NumInput value={s.minOrderValue} onChange={(v) => patch("minOrderValue", v)} min={0} prefix="$" />
        </FieldRow>
        <Divider />
        <FieldRow label="Maximum order value" hint="Orders above this require manual review">
          <NumInput value={s.maxOrderValue} onChange={(v) => patch("maxOrderValue", v)} min={0} prefix="$" />
        </FieldRow>
        <Divider />
        <FieldRow label="Quote TTL" hint="Days before a buyer quote expires if not accepted">
          <NumInput value={s.quoteTtlDays} onChange={(v) => patch("quoteTtlDays", v)} min={1} max={90} suffix="days" />
        </FieldRow>
        <Divider />
        <FieldRow label="Dispute window" hint="Days after delivery that a buyer can raise a dispute">
          <NumInput value={s.disputeWindowDays} onChange={(v) => patch("disputeWindowDays", v)} min={1} max={90} suffix="days" />
        </FieldRow>
      </Section>

      {/* Currency */}
      <Section title="Currency" icon={Globe}>
        <FieldRow label="Default currency" hint="Used when no buyer preference is set">
          <select
            value={s.defaultCurrency}
            onChange={(e) => patch("defaultCurrency", e.target.value)}
            className="appearance-none px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            {s.supportedCurrencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FieldRow>
        <Divider />
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Supported currencies</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CURRENCIES.map((c) => {
              const active = s.supportedCurrencies.includes(c);
              const isDefault = c === s.defaultCurrency;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCurrency(c)}
                  disabled={isDefault}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? "var(--obsidian)" : "var(--surface-secondary)",
                    color: active ? "var(--ivory)" : "var(--text-tertiary)",
                    border: `1px solid ${active ? "transparent" : "var(--border-subtle)"}`,
                    cursor: isDefault ? "not-allowed" : "pointer",
                  }}
                >
                  {c}{isDefault ? " ✓" : ""}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
            Click to toggle. Default currency cannot be removed.
          </p>
        </div>
      </Section>

      {/* Payment Gateways */}
      <Section title="Payment Gateways" icon={CreditCard}>
        <div className="space-y-4">
          {Object.entries(GATEWAY_META).map(([key, meta], i, arr) => {
            const GwIcon = meta.icon;
            const enabled = s.gateways[key] ?? false;
            return (
              <div key={key}>
                <FieldRow label={meta.label} hint={meta.region}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: enabled ? "color-mix(in srgb, var(--success) 10%, transparent)" : "var(--surface-secondary)" }}
                    >
                      <GwIcon className="w-4 h-4" style={{ color: enabled ? "var(--success)" : "var(--text-tertiary)" }} />
                    </div>
                    <Toggle checked={enabled} onChange={(v) => setGateway(key, v)} />
                  </div>
                </FieldRow>
                {i < arr.length - 1 && <div className="mt-4"><Divider /></div>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Admin Notifications" icon={Bell}>
        {(
          [
            { key: "notifyOnNewOrder", label: "New order placed", hint: "Email alert when a buyer submits an order" },
            { key: "notifyOnDispute", label: "Dispute opened", hint: "Email alert when a buyer raises a dispute" },
            { key: "notifyOnPaymentFail", label: "Payment failed", hint: "Alert when a gateway payment fails or bounces" },
            { key: "notifyOnSupplierApply", label: "Supplier application", hint: "Alert when a supplier submits an onboarding application" },
          ] as { key: keyof PlatformSettings; label: string; hint: string }[]
        ).map((item, i, arr) => (
          <div key={item.key}>
            <FieldRow label={item.label} hint={item.hint}>
              <Toggle checked={s[item.key] as boolean} onChange={(v) => patch(item.key, v as PlatformSettings[typeof item.key])} />
            </FieldRow>
            {i < arr.length - 1 && <Divider />}
          </div>
        ))}
      </Section>

      {/* Danger Zone */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)" }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{
            background: "color-mix(in srgb, var(--danger) 5%, transparent)",
            borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
          }}
        >
          <Settings className="w-4 h-4" style={{ color: "var(--danger)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--danger)", fontFamily: "var(--font-display)" }}>
            Danger Zone
          </h2>
        </div>
        <div className="p-6" style={{ background: "var(--surface-primary)" }}>
          <FieldRow
            label="Maintenance mode"
            hint="Prevents buyers from placing new orders. Existing orders are unaffected."
          >
            <Toggle checked={s.maintenanceMode} onChange={(v) => patch("maintenanceMode", v)} />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}
