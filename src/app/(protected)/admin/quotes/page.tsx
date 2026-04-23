import { listPipeline } from "@/lib/queries/quotes-pipeline";
import { QuotesPipelineList } from "@/components/admin/QuotesPipelineList";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPipelinePage() {
  const rows = await listPipeline();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Quotes &amp; requests pipeline
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Unified work queue across RFQ quotations, inbound buyer requests, and ops-originated freight quotes.
        </p>
      </div>
      <QuotesPipelineList initialRows={rows} />
    </div>
  );
}
