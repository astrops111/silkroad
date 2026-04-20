"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Clock,
  MessageSquareQuote,
  Search,
  ChevronRight,
  Filter,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  target_price?: number;
  currency: string;
  quotation_count: number;
  status: string;
  deadline: string;
  required_by?: string;
  created_at: string;
}

type TabKey =
  | "all"
  | "draft"
  | "open"
  | "quoted"
  | "awarded"
  | "expired"
  | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "open", label: "Open" },
  { key: "quoted", label: "Quoted" },
  { key: "awarded", label: "Awarded" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  draft:
    "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] border-[var(--border-default)]",
  open: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20",
  quoted:
    "bg-[var(--amber)]/10 text-[var(--amber-dark)] border-[var(--amber)]/20",
  awarded:
    "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  expired:
    "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  cancelled:
    "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] border-[var(--border-default)]",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function BuyerRFQPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/rfqs?buyerOnly=true");
        if (res.ok) {
          const data = await res.json();
          setRfqs(data.rfqs ?? data ?? []);
        }
      } catch {
        /* network error — leave empty */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = rfqs.filter((r) => {
    if (activeTab !== "all" && r.status !== activeTab) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My RFQs
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your Requests for Quotation
          </p>
        </div>
        <Link href="/dashboard/rfq/new" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          Create New RFQ
        </Link>
      </div>

      {/* Search + Tabs */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQs..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 px-6 pt-3 border-b border-[var(--border-subtle)] overflow-x-auto">
          {TABS.map((tab) => {
            const count = tab.key === "all"
              ? rfqs.length
              : rfqs.filter((r) => r.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? "border-[var(--amber)] text-[var(--amber-dark)]"
                    : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--amber)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--amber)]/10 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-[var(--amber)]" />
            </div>
            <h3
              className="text-lg font-bold text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No RFQs yet
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] mt-1 max-w-sm">
              Create your first Request for Quotation to start receiving quotes
              from verified suppliers across Africa and beyond.
            </p>
            <Link
              href="/dashboard/rfq/new"
              className="btn-primary mt-6"
            >
              <Plus className="w-4 h-4" />
              Create Your First RFQ
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--surface-secondary)]">
                    {[
                      "RFQ #",
                      "Title",
                      "Quantity",
                      "Target Price",
                      "Quotes",
                      "Status",
                      "Deadline",
                      "Created",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/rfq/${rfq.id}`}
                          className="text-sm font-semibold text-[var(--obsidian)] hover:text-[var(--amber-dark)] transition-colors"
                        >
                          {rfq.rfq_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/rfq/${rfq.id}`}
                          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors max-w-[220px] truncate block"
                        >
                          {rfq.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {rfq.quantity.toLocaleString()} {rfq.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="text-sm font-semibold text-[var(--obsidian)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {rfq.target_price
                            ? `${rfq.currency} ${rfq.target_price.toLocaleString()}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo)]">
                          <MessageSquareQuote className="w-3.5 h-3.5" />
                          {rfq.quotation_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${
                            STATUS_STYLES[rfq.status] ?? STATUS_STYLES.draft
                          }`}
                        >
                          {rfq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(rfq.deadline).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {new Date(rfq.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {filtered.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={`/dashboard/rfq/${rfq.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">
                        {rfq.rfq_number}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize ${
                          STATUS_STYLES[rfq.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {rfq.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {rfq.title}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-3">
                      <span>
                        {rfq.quantity.toLocaleString()} {rfq.unit}
                      </span>
                      <span>
                        {rfq.quotation_count} quote{rfq.quotation_count !== 1 && "s"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
