import { listCustomsQueue } from "@/lib/queries/customs";
import { CustomsQueueList } from "@/components/admin/logistics/CustomsQueueList";

export const dynamic = "force-dynamic";

export default async function CustomsQueuePage() {
  const queue = await listCustomsQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Customs queue
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Shipments needing customs attention — pending preparation, declarations in flight, holds
          awaiting resolution. Open the shipment to action a status, file a declaration, or resolve a hold.
        </p>
      </div>
      <CustomsQueueList initialQueue={queue} />
    </div>
  );
}
