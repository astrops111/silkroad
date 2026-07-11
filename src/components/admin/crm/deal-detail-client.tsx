"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ShoppingCart, Ship, Mail, MessageSquare, Building2 } from "lucide-react";
import { ActivityTimeline, type TimelineActivity } from "./activity-timeline";

interface DealPayload {
  deal: {
    id: string;
    status: string;
    title: string | null;
    rfq_id: string | null;
    quotation_id: string | null;
    purchase_order_id: string | null;
    supplier_order_id: string | null;
    shipment_id: string | null;
    conversation_id: string | null;
    created_at: string;
    rfqs: { rfq_number: string; status: string; title: string } | null;
    buyer: { id: string; name: string; country_code: string | null } | null;
    supplier: { id: string; name: string; country_code: string | null } | null;
  };
  opportunity: {
    id: string;
    stage: string;
    amount_minor: number | null;
    currency: string | null;
  } | null;
  quotation: {
    quotation_number: string;
    status: string;
    total_amount: number;
    currency: string;
    supplier_name: string | null;
  } | null;
  activities: TimelineActivity[];
  emailThreads: {
    id: string;
    subject_normalized: string | null;
    message_count: number;
    email_messages: {
      id: string;
      direction: string;
      from_address: string;
      subject: string | null;
      snippet: string | null;
      sent_at: string | null;
    }[];
  }[];
  conversationMessages: {
    id: string;
    sender_name: string | null;
    sender_role: string | null;
    content: string;
    created_at: string;
  }[];
}

function StageChip({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <span
      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
        active
          ? "bg-[var(--amber)]/15 border-[var(--amber)]/40 text-[var(--amber)]"
          : done
            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
            : "bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-tertiary)]"
      }`}
    >
      {label}
    </span>
  );
}

export function DealDetailClient({ dealId }: { dealId: string }) {
  const [data, setData] = useState<DealPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/deals/${dealId}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Failed to load deal"));
  }, [dealId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>;

  const { deal, opportunity, quotation } = data;
  const hasQuote = Boolean(deal.quotation_id);
  const hasOrder = Boolean(deal.purchase_order_id);
  const hasShipment = Boolean(deal.shipment_id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {deal.title ?? deal.rfqs?.title ?? "Deal"}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {deal.rfqs?.rfq_number ?? "—"} · opened{" "}
              {new Date(deal.created_at).toLocaleDateString()}
            </p>
          </div>
          {opportunity?.amount_minor != null && (
            <p className="text-lg font-bold text-[var(--obsidian)]">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: opportunity.currency ?? "USD",
              }).format(opportunity.amount_minor / 100)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StageChip label="RFQ" done={Boolean(deal.rfq_id)} active={!hasQuote} />
          <StageChip label="Quoted" done={hasQuote} active={hasQuote && !hasOrder} />
          <StageChip label="Order" done={hasOrder} active={hasOrder && !hasShipment} />
          <StageChip label="Shipment" done={hasShipment} active={hasShipment} />
          <span className="ml-auto text-[11px] uppercase font-semibold text-[var(--text-tertiary)]">
            {opportunity?.stage ?? deal.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Building2 className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span>
              Buyer: <strong>{deal.buyer?.name ?? "—"}</strong>
              {deal.buyer?.country_code ? ` (${deal.buyer.country_code})` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Building2 className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span>
              Supplier: <strong>{deal.supplier?.name ?? "—"}</strong>
              {deal.supplier?.country_code ? ` (${deal.supplier.country_code})` : ""}
            </span>
          </div>
          {quotation && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
              <span>
                Quote <strong>{quotation.quotation_number}</strong> · {quotation.status}
              </span>
            </div>
          )}
          {deal.purchase_order_id && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <ShoppingCart className="w-4 h-4 text-[var(--text-tertiary)]" />
              <Link href="/admin/orders" className="hover:text-[var(--amber)]">
                View order
              </Link>
            </div>
          )}
          {deal.shipment_id && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Ship className="w-4 h-4 text-[var(--text-tertiary)]" />
              <Link href="/admin/logistics/shipments" className="hover:text-[var(--amber)]">
                View shipment
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Timeline */}
        <div className="col-span-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
            Deal timeline
          </h3>
          <ActivityTimeline
            filter={{ dealThreadId: deal.id }}
            initialActivities={data.activities}
            allowNotes
          />
        </div>

        {/* Communications */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email threads
            </h3>
            {data.emailThreads.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)]">No linked email threads</p>
            )}
            {data.emailThreads.map((t) => (
              <div key={t.id} className="mb-3 last:mb-0">
                <Link
                  href="/admin/mail"
                  className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--amber)]"
                >
                  {t.subject_normalized ?? "(no subject)"} · {t.message_count} messages
                </Link>
                {t.email_messages.slice(0, 3).map((m) => (
                  <p key={m.id} className="text-xs text-[var(--text-secondary)] truncate mt-1">
                    <span className="text-[var(--text-tertiary)]">
                      {m.direction === "outbound" ? "→" : "←"} {m.from_address}:
                    </span>{" "}
                    {m.snippet}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> In-app conversation
            </h3>
            {data.conversationMessages.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)]">No linked conversation</p>
            )}
            {data.conversationMessages.slice(0, 8).map((m) => (
              <div key={m.id} className="mb-2 last:mb-0">
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">
                    {m.sender_name ?? m.sender_role ?? "User"}:
                  </span>{" "}
                  {m.content.slice(0, 120)}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
