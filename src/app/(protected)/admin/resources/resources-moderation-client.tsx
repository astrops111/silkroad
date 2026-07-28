"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileCheck2,
  FileX2,
  Gem,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { moderateResourceListing } from "@/lib/actions/resources-listing";

export type ModerationListing = {
  id: string;
  name: string;
  supplierName: string | null;
  supplierVerification: string | null;
  originCountry: string | null;
  originRegion: string | null;
  grade: string | null;
  unitOfMeasure: string | null;
  pricePerUnitUsd: number | null;
  currency: string | null;
  availableQuantity: number | null;
  incoterm: string | null;
  imageCount: number;
  createdAt: string | null;
  complianceRefs: { label: string; value: string | null }[];
};

export type ModerationCounts = {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ResourcesModerationClient({
  listings: initial,
  counts,
}: {
  listings: ModerationListing[];
  counts: ModerationCounts;
}) {
  const [listings, setListings] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decided, setDecided] = useState({ approved: 0, rejected: 0 });

  const kpis = [
    { label: "Pending Review", value: counts.pending - decided.approved - decided.rejected, icon: Clock, accent: "var(--warning)" },
    { label: "Live Listings", value: counts.approved + decided.approved, icon: CheckCircle2, accent: "var(--success)" },
    { label: "Rejected", value: counts.rejected + decided.rejected, icon: XCircle, accent: "var(--danger)" },
    { label: "Suspended", value: counts.suspended, icon: Ban, accent: "var(--text-tertiary)" },
  ];

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const res = await moderateResourceListing(id, decision);
      if (!res.success) throw new Error(res.error ?? "Request failed");
      setListings((prev) => prev.filter((l) => l.id !== id));
      setDecided((d) =>
        decision === "approved"
          ? { ...d, approved: d.approved + 1 }
          : { ...d, rejected: d.rejected + 1 }
      );
      toast.success(
        decision === "approved" ? "Listing approved — now live" : "Listing rejected"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Resource Listings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Compliance review for raw-material listings (Kimberley, CITES, GACC,
          3TG). Approval makes the listing publicly visible.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-6 rounded-2xl border"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
            >
              <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
            </div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {kpi.value}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Queue */}
      {listings.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <Gem className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--success)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Queue clear
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            No listings awaiting review. New supplier listings land here as
            “pending”.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => {
            const busy = busyId === l.id;
            return (
              <div
                key={l.id}
                className="rounded-2xl border p-6"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-base"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {l.name}
                      </span>
                      {l.grade && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            color: "var(--text-secondary)",
                            background: "var(--surface-secondary)",
                          }}
                        >
                          {l.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {l.supplierName ?? "Unknown supplier"}
                      {l.supplierVerification && l.supplierVerification !== "verified" && (
                        <span className="ml-1 font-medium" style={{ color: "var(--warning)" }}>
                          (KYC: {l.supplierVerification})
                        </span>
                      )}
                      {" · "}
                      {[l.originRegion, l.originCountry].filter(Boolean).join(", ") || "origin unknown"}
                      {" · submitted "}
                      {fmtDate(l.createdAt)}
                    </p>
                  </div>
                  <div className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {l.pricePerUnitUsd != null
                        ? `$${l.pricePerUnitUsd.toLocaleString()} / ${l.unitOfMeasure ?? "unit"}`
                        : "—"}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {l.availableQuantity != null
                        ? `${l.availableQuantity.toLocaleString()} ${l.unitOfMeasure ?? ""} available`
                        : ""}
                      {l.incoterm ? ` · ${l.incoterm}` : ""}
                      {` · ${l.imageCount} image${l.imageCount === 1 ? "" : "s"}`}
                    </div>
                  </div>
                </div>

                {/* Compliance refs */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {l.complianceRefs.map((ref) => (
                    <div
                      key={ref.label}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: ref.value
                          ? "color-mix(in srgb, var(--success) 8%, transparent)"
                          : "var(--surface-secondary)",
                        color: ref.value ? "var(--success)" : "var(--text-tertiary)",
                      }}
                    >
                      {ref.value ? (
                        <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <FileX2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">
                        {ref.label}
                        {ref.value ? `: ${ref.value}` : " — none"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => decide(l.id, "approved")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: "color-mix(in srgb, var(--success) 12%, transparent)",
                      color: "var(--success)",
                      border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
                    }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => decide(l.id, "rejected")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{
                      color: "var(--danger)",
                      border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                    }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
