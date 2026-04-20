"use client";

import { useState } from "react";
import {
  User,
  Globe,
  Bell,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    preferredLocale: "en",
    preferredCurrency: "USD",
    countryCode: "",
    emailNotifications: true,
    orderUpdates: true,
    rfqAlerts: true,
    promotionalEmails: false,
  });

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Settings saved");
    setLoading(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Account Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Manage your profile, preferences, and notifications
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4" style={{ color: "var(--amber)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Full Name</label>
            <input value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)} placeholder="Your name"
              className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Email</label>
            <input value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="email@company.com" type="email"
              className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Phone</label>
            <input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="+254 700 000 000"
              className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Country</label>
            <input value={form.countryCode} onChange={(e) => updateForm("countryCode", e.target.value)} placeholder="KE"
              className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4" style={{ color: "var(--indigo)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preferences</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Language</label>
            <select value={form.preferredLocale} onChange={(e) => updateForm("preferredLocale", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm appearance-none" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="zh">中文</option>
              <option value="sw">Kiswahili</option>
              <option value="ar">العربية</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Currency</label>
            <select value={form.preferredCurrency} onChange={(e) => updateForm("preferredCurrency", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm appearance-none" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
              {["USD", "EUR", "GBP", "KES", "NGN", "GHS", "ZAR", "CNY", "UGX", "TZS", "RWF", "ETB"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border p-6 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4" style={{ color: "var(--success)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</h2>
        </div>
        {[
          { key: "orderUpdates", label: "Order status updates", desc: "Get notified when your order status changes" },
          { key: "rfqAlerts", label: "RFQ alerts", desc: "Notifications when suppliers respond to your RFQs" },
          { key: "emailNotifications", label: "Email notifications", desc: "Receive email for important updates" },
          { key: "promotionalEmails", label: "Promotional emails", desc: "New products, deals, and marketplace updates" },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{item.desc}</p>
            </div>
            <button
              onClick={() => updateForm(item.key, !form[item.key as keyof typeof form])}
              className="relative w-10 h-6 rounded-full transition-all"
              style={{ background: form[item.key as keyof typeof form] ? "var(--success)" : "var(--border-default)" }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
                style={{ left: form[item.key as keyof typeof form] ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </label>
        ))}
      </div>

      <button onClick={handleSave} disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
        style={{ background: "var(--obsidian)", color: "var(--ivory)" }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}
