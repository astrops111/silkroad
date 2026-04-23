import { listPorts } from "@/lib/queries/logistics-reference";
import { OpsFreightQuoteForm } from "@/components/admin/logistics/OpsFreightQuoteForm";

export const dynamic = "force-dynamic";

export default async function NewOpsFreightQuotePage() {
  const ports = await listPorts();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New freight quote
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Ops-originated quote. Fill in the requester + cargo, compute the landed cost, then save.
        </p>
      </div>
      <OpsFreightQuoteForm mode="create" ports={ports} />
    </div>
  );
}
