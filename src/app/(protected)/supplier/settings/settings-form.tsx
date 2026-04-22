"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  Banknote,
  Truck,
  Factory,
  Globe,
  FileCheck,
  Save,
  Loader2,
  X,
  Plus,
  BadgeCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUploader from "@/components/product/ImageUploader";
import DocumentUploader from "@/components/product/DocumentUploader";
import {
  updateCompanyProfile,
  updateSupplierProfile,
} from "@/lib/actions/supplier-profile";
import type {
  MarketRegion,
  TradeTerm,
  VerificationStatus,
  SupplierTier,
} from "@/lib/supabase/database.types";

const TRADE_TERMS: { value: TradeTerm; label: string }[] = [
  { value: "fob", label: "FOB (Free on Board)" },
  { value: "cif", label: "CIF (Cost, Insurance & Freight)" },
  { value: "exw", label: "EXW (Ex Works)" },
  { value: "ddp", label: "DDP (Delivered Duty Paid)" },
  { value: "dap", label: "DAP (Delivered at Place)" },
  { value: "cpt", label: "CPT (Carriage Paid To)" },
  { value: "fca", label: "FCA (Free Carrier)" },
];

const MARKET_REGIONS: { value: MarketRegion; label: string }[] = [
  { value: "cn", label: "China" },
  { value: "africa_west", label: "Africa — West" },
  { value: "africa_east", label: "Africa — East" },
  { value: "africa_south", label: "Africa — South" },
  { value: "africa_central", label: "Africa — Central" },
  { value: "africa_north", label: "Africa — North" },
  { value: "global", label: "Global" },
];

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const MOBILE_MONEY_PROVIDERS = [
  "MTN Mobile Money",
  "Vodafone Cash",
  "AirtelTigo Money",
  "M-Pesa",
  "Orange Money",
  "Wave",
];

interface CompanyState {
  name: string;
  nameLocal: string;
  description: string;
  website: string;
  industry: string;
  countryCode: string;
  city: string;
  stateProvince: string;
  address: string;
  logoUrl: string;
  establishedYear: string;
  employeeCountRange: string;
  marketRegion: MarketRegion;
  taxId: string;
  taxIdType: string;
}

interface ProfileState {
  factoryAddress: string;
  factoryCity: string;
  factoryCountry: string;
  businessLicenseUrl: string;
  moqDefault: string;
  leadTimeDaysDefault: string;
  tradeTermsDefault: TradeTerm;
  certifications: string[];
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankBranch: string;
  mobileMoneyNumber: string;
  mobileMoneyProvider: string;
}

interface Props {
  companyId: string;
  initial: { company: CompanyState; profile: ProfileState };
  verification: { status: VerificationStatus; tier: SupplierTier };
}

export default function SettingsForm({ companyId, initial, verification }: Props) {
  const [company, setCompany] = useState<CompanyState>(initial.company);
  const [profile, setProfile] = useState<ProfileState>(initial.profile);
  const [certInput, setCertInput] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "mobile">(
    initial.profile.mobileMoneyNumber ? "mobile" : "bank"
  );
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setC<K extends keyof CompanyState>(k: K, v: CompanyState[K]) {
    setCompany((prev) => ({ ...prev, [k]: v }));
  }
  function setP<K extends keyof ProfileState>(k: K, v: ProfileState[K]) {
    setProfile((prev) => ({ ...prev, [k]: v }));
  }

  function saveCompany() {
    setSavingSection("company");
    startTransition(async () => {
      const res = await updateCompanyProfile({
        name: company.name,
        nameLocal: company.nameLocal,
        description: company.description,
        website: company.website,
        industry: company.industry,
        countryCode: company.countryCode,
        city: company.city,
        stateProvince: company.stateProvince,
        address: company.address,
        logoUrl: company.logoUrl,
        establishedYear: company.establishedYear
          ? parseInt(company.establishedYear)
          : undefined,
        employeeCountRange: company.employeeCountRange,
        marketRegion: company.marketRegion,
        taxId: company.taxId,
        taxIdType: company.taxIdType,
      });
      setSavingSection(null);
      if (!res.success) toast.error(res.error ?? "Failed to save");
      else toast.success("Company profile saved");
    });
  }

  function saveFactory() {
    setSavingSection("factory");
    startTransition(async () => {
      const res = await updateSupplierProfile({
        factoryAddress: profile.factoryAddress,
        factoryCity: profile.factoryCity,
        factoryCountry: profile.factoryCountry,
        moqDefault: profile.moqDefault ? parseInt(profile.moqDefault) : undefined,
        leadTimeDaysDefault: profile.leadTimeDaysDefault
          ? parseInt(profile.leadTimeDaysDefault)
          : undefined,
        tradeTermsDefault: profile.tradeTermsDefault,
        certifications: profile.certifications,
        businessLicenseUrl: profile.businessLicenseUrl,
      });
      setSavingSection(null);
      if (!res.success) toast.error(res.error ?? "Failed to save");
      else toast.success("Factory info saved");
    });
  }

  function savePayout() {
    setSavingSection("payout");
    startTransition(async () => {
      const res = await updateSupplierProfile(
        payoutMethod === "bank"
          ? {
              bankCode: profile.bankCode,
              bankAccountName: profile.bankAccountName,
              bankAccountNumber: profile.bankAccountNumber,
              bankBranch: profile.bankBranch,
              mobileMoneyNumber: "",
              mobileMoneyProvider: "",
            }
          : {
              mobileMoneyProvider: profile.mobileMoneyProvider,
              mobileMoneyNumber: profile.mobileMoneyNumber,
              bankCode: "",
              bankAccountNumber: "",
              bankAccountName: "",
              bankBranch: "",
            }
      );
      setSavingSection(null);
      if (!res.success) toast.error(res.error ?? "Failed to save");
      else toast.success("Payout details saved");
    });
  }

  function addCert() {
    const v = certInput.trim();
    if (!v) return;
    if (profile.certifications.includes(v)) {
      setCertInput("");
      return;
    }
    setP("certifications", [...profile.certifications, v]);
    setCertInput("");
  }

  function removeCert(c: string) {
    setP(
      "certifications",
      profile.certifications.filter((x) => x !== c)
    );
  }

  const uploadFolder = `supplier-${companyId}/profile/`;

  const verifyBadge =
    verification.status === "verified"
      ? { icon: BadgeCheck, label: "Verified", tone: "success" }
      : verification.status === "rejected"
        ? { icon: ShieldAlert, label: "Rejected", tone: "danger" }
        : verification.status === "pending"
          ? { icon: ShieldAlert, label: "Under review", tone: "amber" }
          : { icon: ShieldAlert, label: "Unverified", tone: "muted" };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Company Settings
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Your public profile, factory details, and payout information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {verification.tier} tier
          </Badge>
          <Badge
            variant={
              verifyBadge.tone === "success"
                ? "default"
                : verifyBadge.tone === "danger"
                  ? "destructive"
                  : "secondary"
            }
          >
            <verifyBadge.icon className="w-3 h-3" />
            {verifyBadge.label}
          </Badge>
        </div>
      </div>

      {/* COMPANY PROFILE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--amber)]" />
            Company Profile
          </CardTitle>
          <CardDescription>
            How your business is shown to buyers and on your storefront.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-[var(--text-tertiary)]" />
              )}
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">Logo</Label>
              <ImageUploader
                bucket="products"
                folder={uploadFolder}
                maxFiles={1}
                onUpload={(file) => setC("logoUrl", file.url)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input
                value={company.name}
                onChange={(e) => setC("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (local language)</Label>
              <Input
                value={company.nameLocal}
                onChange={(e) => setC("nameLocal", e.target.value)}
                placeholder="e.g. 广州永盛贸易有限公司"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={company.description}
              onChange={(e) => setC("description", e.target.value)}
              rows={3}
              placeholder="Describe what your business does, years in operation, specialties…"
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={company.website}
                onChange={(e) => setC("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={company.industry}
                onChange={(e) => setC("industry", e.target.value)}
                placeholder="e.g. Cosmetics, Electronics"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Country (ISO-2) *</Label>
              <Input
                value={company.countryCode}
                onChange={(e) =>
                  setC("countryCode", e.target.value.toUpperCase())
                }
                maxLength={2}
                placeholder="CN"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={company.city}
                onChange={(e) => setC("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State / Province</Label>
              <Input
                value={company.stateProvince}
                onChange={(e) => setC("stateProvince", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={company.address}
              onChange={(e) => setC("address", e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Market region</Label>
              <Select
                value={company.marketRegion}
                onValueChange={(v) => setC("marketRegion", v as MarketRegion)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employees</Label>
              <Select
                value={company.employeeCountRange}
                onValueChange={(v) => setC("employeeCountRange", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Established year</Label>
              <Input
                type="number"
                value={company.establishedYear}
                onChange={(e) => setC("establishedYear", e.target.value)}
                placeholder="e.g. 2012"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input
                value={company.taxId}
                onChange={(e) => setC("taxId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID type</Label>
              <Input
                value={company.taxIdType}
                onChange={(e) => setC("taxIdType", e.target.value)}
                placeholder="e.g. USCC (China), VAT (EU)"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveCompany} disabled={pending}>
              {savingSection === "company" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FACTORY & OPERATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-[var(--amber)]" />
            Factory & Operations
          </CardTitle>
          <CardDescription>
            Where you produce, default terms for new products, and your certifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Factory address</Label>
            <Input
              value={profile.factoryAddress}
              onChange={(e) => setP("factoryAddress", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Factory city</Label>
              <Input
                value={profile.factoryCity}
                onChange={(e) => setP("factoryCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Factory country (ISO-2)</Label>
              <Input
                value={profile.factoryCountry}
                onChange={(e) =>
                  setP("factoryCountry", e.target.value.toUpperCase())
                }
                maxLength={2}
                placeholder="CN"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default MOQ</Label>
              <Input
                type="number"
                value={profile.moqDefault}
                onChange={(e) => setP("moqDefault", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default lead time (days)</Label>
              <Input
                type="number"
                value={profile.leadTimeDaysDefault}
                onChange={(e) => setP("leadTimeDaysDefault", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default trade term</Label>
              <Select
                value={profile.tradeTermsDefault}
                onValueChange={(v) => setP("tradeTermsDefault", v as TradeTerm)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <div className="flex gap-2">
              <Input
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCert();
                  }
                }}
                placeholder="e.g. ISO 9001, CE, FDA"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCert}
                disabled={!certInput.trim()}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            {profile.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {profile.certifications.map((c) => (
                  <Badge key={c} variant="secondary" className="pr-1">
                    {c}
                    <button
                      onClick={() => removeCert(c)}
                      className="ml-1 rounded hover:bg-black/10 p-0.5"
                      aria-label={`Remove ${c}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <Label className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[var(--text-tertiary)]" />
              Business license
            </Label>
            {profile.businessLicenseUrl && (
              <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm">
                <a
                  href={profile.businessLicenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--amber-dark)] hover:underline truncate"
                >
                  View current license
                </a>
                <button
                  onClick={() => setP("businessLicenseUrl", "")}
                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                  aria-label="Remove license"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <DocumentUploader
              folder={uploadFolder}
              maxFiles={1}
              onUpload={(doc) => setP("businessLicenseUrl", doc.url)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveFactory} disabled={pending}>
              {savingSection === "factory" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save factory details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PAYOUT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[var(--amber)]" />
            Payout Method
          </CardTitle>
          <CardDescription>
            How the platform settles your earnings after orders complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayoutMethod("bank")}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                payoutMethod === "bank"
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                  : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              Bank account
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod("mobile")}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                payoutMethod === "mobile"
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                  : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              Mobile money
            </button>
          </div>

          {payoutMethod === "bank" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank name / code</Label>
                <Input
                  value={profile.bankCode}
                  onChange={(e) => setP("bankCode", e.target.value)}
                  placeholder="e.g. ICBC China"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input
                  value={profile.bankBranch}
                  onChange={(e) => setP("bankBranch", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Account name</Label>
                <Input
                  value={profile.bankAccountName}
                  onChange={(e) => setP("bankAccountName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Account number</Label>
                <Input
                  value={profile.bankAccountNumber}
                  onChange={(e) => setP("bankAccountNumber", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={profile.mobileMoneyProvider}
                  onValueChange={(v) => setP("mobileMoneyProvider", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_MONEY_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mobile number</Label>
                <Input
                  type="tel"
                  value={profile.mobileMoneyNumber}
                  onChange={(e) => setP("mobileMoneyNumber", e.target.value)}
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={savePayout} disabled={pending}>
              {savingSection === "payout" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save payout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
            Not here?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--text-secondary)] space-y-2">
          <p>
            <Truck className="w-4 h-4 inline mr-1 text-[var(--text-tertiary)]" />
            Shipping rules live on each product and in your default trade term above.
          </p>
          <p>Staff members and invitations are managed on the Contacts page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
