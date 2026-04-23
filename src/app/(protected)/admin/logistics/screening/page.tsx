import { listPendingScreening } from "@/lib/queries/screening";
import { ScreeningQueueList } from "@/components/admin/logistics/ScreeningQueueList";

export const dynamic = "force-dynamic";

export default async function ScreeningQueuePage() {
  const queue = await listPendingScreening();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Compliance screening
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Quotes held because the requester matched a sanctions or denied-party list. Clear
          to release the quote back to draft, or reject to archive it. Decision notes are
          required for the audit trail.
        </p>
      </div>
      <ScreeningQueueList initialQueue={queue} />
    </div>
  );
}
