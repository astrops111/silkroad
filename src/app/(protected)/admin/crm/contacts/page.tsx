import { ContactsClient } from "@/components/admin/crm/contacts-client";

export const metadata = {
  title: "Contacts — CRM",
};

export default function CrmContactsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contacts
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Buyer and supplier platform users plus external email contacts, with full activity history
        </p>
      </div>
      <ContactsClient />
    </div>
  );
}
