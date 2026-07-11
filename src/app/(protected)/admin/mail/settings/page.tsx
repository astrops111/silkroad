import { MailboxSettingsClient } from "@/components/admin/mail/mailbox-settings-client";

export const metadata = {
  title: "Mailbox Settings — Admin",
};

export default function MailboxSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mailbox Settings
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Manage company shared and personal mailboxes, per-user access, and sync health
        </p>
      </div>
      <MailboxSettingsClient />
    </div>
  );
}
