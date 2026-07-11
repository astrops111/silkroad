import { DealDetailClient } from "@/components/admin/crm/deal-detail-client";

export const metadata = {
  title: "Deal — Admin",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Deal Thread
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Quote → response → order → logistics, with every touchpoint on one timeline
        </p>
      </div>
      <DealDetailClient dealId={id} />
    </div>
  );
}
