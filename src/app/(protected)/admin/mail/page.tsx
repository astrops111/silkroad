import { MailClient } from "@/components/admin/mail/mail-client";

export const metadata = {
  title: "Mail — Admin",
};

export default function AdminMailPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mail
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Company mailboxes — synced every 5 minutes from mail.privateemail.com
        </p>
      </div>
      <MailClient />
    </div>
  );
}
