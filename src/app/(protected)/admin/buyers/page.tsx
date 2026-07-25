"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCircle2,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";

type BuyerStatus = "active" | "pending_kyc" | "suspended";

interface Buyer {
  id: string;
  companyName: string;
  city: string | null;
  countryCode: string;
  isActive: boolean;
  verificationStatus: string | null;
  creditLimit: number | null;
  contact: { full_name: string | null; email: string | null } | null;
  totalOrders: number;
  totalGmv: number;
  lastOrderAt: string | null;
}

function deriveStatus(buyer: Buyer): BuyerStatus {
  if (!buyer.isActive) return "suspended";
  if (buyer.verificationStatus === "pending") return "pending_kyc";
  return "active";
}

const statusConfig: Record<BuyerStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active:      { label: "Active",      color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending_kyc: { label: "Pending KYC", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  suspended:   { label: "Suspended",   color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
};

export default function AdminBuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/admin/buyers?${params.toString()}`);
      const data = await res.json();
      setBuyers(res.ok ? data.buyers ?? [] : []);
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Buyers
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {buyers === null ? "Loading…" : `${buyers.length} buyer accounts`}
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl max-w-md" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          placeholder="Search by company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {buyers === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Company", "Contact", "Orders", "GMV", "Last Order", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => {
                  const status = statusConfig[deriveStatus(buyer)];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={buyer.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{buyer.companyName}</p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{buyer.city ? `${buyer.city}, ` : ""}{buyer.countryCode}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.contact?.full_name ?? "—"}</p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{buyer.contact?.email ?? ""}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{buyer.totalOrders}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {buyer.totalGmv > 0 ? `$${(buyer.totalGmv / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {buyer.lastOrderAt ? new Date(buyer.lastOrderAt).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/buyers/${buyer.id}`} className="p-1.5 rounded-lg inline-flex items-center" style={{ color: "var(--text-tertiary)" }} title="View details">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {buyers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      <UserCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                      No buyers match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
