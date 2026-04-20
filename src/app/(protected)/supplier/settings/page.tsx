"use client";

import { useState } from "react";
import { Building2, Banknote, Truck, Save } from "lucide-react";

const COUNTRIES = [
  "Ghana",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Tanzania",
  "Ethiopia",
  "Ivory Coast",
  "Cameroon",
  "Senegal",
  "Uganda",
  "Rwanda",
  "Morocco",
  "Egypt",
  "Other",
];

const MOBILE_MONEY_PROVIDERS = [
  "MTN Mobile Money",
  "Vodafone Cash",
  "AirtelTigo Money",
  "M-Pesa",
  "Orange Money",
  "Wave",
  "Other",
];

const TRADE_TERMS = ["FOB", "CIF", "EXW", "DDP", "FCA", "CFR", "DAP"];

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all"
      />
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A7F8E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
      </label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all resize-none"
      />
    </div>
  );
}

export default function SupplierSettings() {
  // Company Profile
  const [companyName, setCompanyName] = useState("Accra Exports Ltd");
  const [description, setDescription] = useState(
    "Leading supplier of premium shea butter, cocoa, and traditional African products for international trade."
  );
  const [address, setAddress] = useState("14 Liberation Road, Accra");
  const [country, setCountry] = useState("Ghana");

  // Bank & Payout
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "mobile">("bank");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileProvider, setMobileProvider] = useState("");

  // Shipping
  const [tradeTerms, setTradeTerms] = useState("FOB");
  const [leadTime, setLeadTime] = useState("7");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage your company profile, payouts, and shipping preferences.
        </p>
      </div>

      {/* Company Profile */}
      <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--amber-glow)] flex items-center justify-center">
            <Building2 size={18} className="text-[var(--amber)]" />
          </div>
          <div>
            <h2
              className="text-lg font-bold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Company Profile
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Your public-facing business information.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <InputField
            label="Company Name"
            placeholder="e.g. Accra Exports Ltd"
            value={companyName}
            onChange={setCompanyName}
          />
          <TextareaField
            label="Description"
            placeholder="Describe your business and products..."
            value={description}
            onChange={setDescription}
            rows={3}
          />
          <InputField
            label="Address"
            placeholder="Street address, city"
            value={address}
            onChange={setAddress}
          />
          <SelectField
            label="Country"
            options={COUNTRIES}
            value={country}
            onChange={setCountry}
          />
        </div>
      </section>

      {/* Bank & Payout */}
      <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--indigo-glow)] flex items-center justify-center">
            <Banknote size={18} className="text-[var(--indigo)]" />
          </div>
          <div>
            <h2
              className="text-lg font-bold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bank & Payout
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Configure how you receive payments.
            </p>
          </div>
        </div>

        {/* Payout method toggle */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Payout Method
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setPayoutMethod("bank")}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                payoutMethod === "bank"
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                  : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              Bank Account
            </button>
            <button
              onClick={() => setPayoutMethod("mobile")}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                payoutMethod === "mobile"
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                  : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              Mobile Money
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {payoutMethod === "bank" ? (
            <>
              <InputField
                label="Bank Name"
                placeholder="e.g. Ecobank Ghana"
                value={bankName}
                onChange={setBankName}
              />
              <InputField
                label="Account Number"
                placeholder="Enter your bank account number"
                value={bankAccount}
                onChange={setBankAccount}
              />
              <InputField
                label="SWIFT / BIC Code"
                placeholder="e.g. EABORUAC"
                value={swiftCode}
                onChange={setSwiftCode}
              />
            </>
          ) : (
            <>
              <SelectField
                label="Mobile Money Provider"
                options={MOBILE_MONEY_PROVIDERS}
                value={mobileProvider}
                onChange={setMobileProvider}
              />
              <InputField
                label="Mobile Number"
                placeholder="+233 XX XXX XXXX"
                value={mobileNumber}
                onChange={setMobileNumber}
                type="tel"
              />
            </>
          )}
        </div>
      </section>

      {/* Shipping */}
      <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--terracotta-glow)] flex items-center justify-center">
            <Truck size={18} className="text-[var(--terracotta)]" />
          </div>
          <div>
            <h2
              className="text-lg font-bold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Shipping Preferences
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Set default trade terms and lead times.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SelectField
            label="Default Trade Terms (Incoterms)"
            options={TRADE_TERMS}
            value={tradeTerms}
            onChange={setTradeTerms}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Default Lead Time (days)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={120}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-24 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all"
              />
              <span className="text-sm text-[var(--text-tertiary)]">
                business days after order confirmation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <button className="btn-primary">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
