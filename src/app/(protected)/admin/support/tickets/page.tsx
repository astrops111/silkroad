import { TicketsClient } from "@/components/admin/support/tickets-client";

export const metadata = {
  title: "Support Tickets — Admin",
};

export default function SupportTicketsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Support Tickets
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Tickets from support@silkroad.africa, in-app requests, and AI intake — with auto-acknowledgement
        </p>
      </div>
      <TicketsClient />
    </div>
  );
}
