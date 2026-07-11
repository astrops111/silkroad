import { OpportunitiesBoard } from "@/components/admin/crm/opportunities-board";

export const metadata = {
  title: "Opportunities — CRM",
};

export default function CrmOpportunitiesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Opportunities
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Deal pipeline — stages advance automatically with the RFQ → quote → order lifecycle
        </p>
      </div>
      <OpportunitiesBoard />
    </div>
  );
}
