import { listOpsFreightQuotes } from "@/lib/queries/ops-freight-quotes";
import { OpsFreightQuotesList } from "@/components/admin/logistics/OpsFreightQuotesList";

export const dynamic = "force-dynamic";

export default async function OpsFreightQuotesPage() {
  const quotes = await listOpsFreightQuotes();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Freight quotes
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Ops-originated quotes for forwarders, walk-ins, and partners. Each runs through the landed-cost engine.
        </p>
      </div>
      <OpsFreightQuotesList initialQuotes={quotes} />
    </div>
  );
}
