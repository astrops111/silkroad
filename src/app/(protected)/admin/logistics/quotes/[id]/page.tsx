import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getOpsFreightQuote } from "@/lib/queries/ops-freight-quotes";
import { readCostBreakdown } from "@/lib/actions/ops-freight-quotes";
import { listPorts } from "@/lib/queries/logistics-reference";
import { OpsFreightQuoteForm } from "@/components/admin/logistics/OpsFreightQuoteForm";

export const dynamic = "force-dynamic";

export default async function OpsFreightQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, ports] = await Promise.all([getOpsFreightQuote(id), listPorts()]);
  if (!quote) notFound();

  const breakdown = readCostBreakdown(quote);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Freight quote {quote.quote_number}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Status: {quote.status}
          {quote.valid_until ? ` · valid until ${quote.valid_until}` : ""}
        </p>
      </div>

      {quote.status === "pending_screening" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="flex-1 space-y-1 text-sm">
            <p className="font-semibold text-amber-900">Held for compliance review</p>
            <p className="text-amber-800">
              The requester matched a sanctions or denied-party list. Sending and conversion are
              blocked until a compliance reviewer clears the check.
            </p>
            <Link
              href="/admin/logistics/screening"
              className="inline-block font-medium text-amber-900 underline"
            >
              Open screening queue →
            </Link>
          </div>
        </div>
      )}

      <OpsFreightQuoteForm mode="edit" ports={ports} existing={quote} initialBreakdown={breakdown} />
    </div>
  );
}
