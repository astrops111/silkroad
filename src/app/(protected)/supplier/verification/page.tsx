"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Upload, FileText, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { submitVerification } from "@/lib/actions/verification";
import { toast } from "sonner";

const TAX_ID_TYPES = [
  { value: "gh_tin", label: "Ghana TIN" },
  { value: "ke_pin", label: "Kenya PIN" },
  { value: "ng_tin", label: "Nigeria TIN" },
  { value: "za_vat", label: "South Africa VAT" },
  { value: "cn_uscc", label: "China USCC" },
  { value: "generic", label: "Other" },
];

export default function SupplierVerificationPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"unverified" | "pending" | "verified">("unverified");

  const [form, setForm] = useState({
    taxId: "",
    taxIdType: "",
    businessLicenseUrl: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await submitVerification("company-id", {
      taxId: form.taxId || undefined,
      taxIdType: form.taxIdType || undefined,
      businessLicenseUrl: form.businessLicenseUrl || undefined,
    });

    if (!result.success) {
      toast.error(result.error ?? "Submission failed");
      setLoading(false);
      return;
    }

    setStatus("pending");
    toast.success("Verification documents submitted! We'll review within 2-3 business days.");
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Supplier Verification
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Get verified to build trust with buyers and unlock premium features
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            status === "verified" ? "bg-green-100" : status === "pending" ? "bg-amber-100" : "bg-gray-100"
          }`}>
            {status === "verified" ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : status === "pending" ? (
              <Clock className="w-6 h-6 text-amber-600" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[var(--obsidian)]">
              {status === "verified" ? "Verified Supplier" : status === "pending" ? "Verification Pending" : "Not Verified"}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              {status === "verified"
                ? "Your company has been verified. You have a verified badge on your profile."
                : status === "pending"
                  ? "Your documents are under review. This usually takes 2-3 business days."
                  : "Submit your documents below to get verified."}
            </p>
          </div>
          <Badge variant={status === "verified" ? "default" : status === "pending" ? "secondary" : "outline"} className="shrink-0">
            {status}
          </Badge>
        </CardContent>
      </Card>

      {status !== "verified" && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Verification Documents</CardTitle>
            <CardDescription>Provide your business documents for review</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tax ID Type</Label>
                <Select value={form.taxIdType} onValueChange={(v) => setForm((p) => ({ ...p, taxIdType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_ID_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                <Input
                  id="taxId"
                  value={form.taxId}
                  onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                  placeholder="Enter your tax identification number"
                />
              </div>

              <div className="space-y-2">
                <Label>Business License</Label>
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-6 text-center hover:border-[var(--amber)] transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    PDF, JPG, PNG up to 10MB
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Factory / Office Photos (optional)</Label>
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-6 text-center hover:border-[var(--amber)] transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">Upload photos of your premises</p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || status === "pending"}>
                {loading ? <Loader2 className="animate-spin" /> : <FileText className="w-4 h-4" />}
                {loading ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Benefits of Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              "Verified badge on your profile and products",
              "Higher visibility in search results",
              "Increased buyer trust and conversion rates",
              "Access to Trade Assurance orders",
              "Priority customer support",
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
