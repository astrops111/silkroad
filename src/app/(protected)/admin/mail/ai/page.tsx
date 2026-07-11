import { AiMailClient } from "@/components/admin/mail/ai-mail-client";

export const metadata = {
  title: "AI & Templates — Mail",
};

export default function AiMailPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          AI & Templates
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Email-processing skills, AI drafts awaiting your approval, and managed templates
        </p>
      </div>
      <AiMailClient />
    </div>
  );
}
