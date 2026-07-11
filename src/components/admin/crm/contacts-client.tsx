"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, UserCircle2, Building2, Globe, BadgeCheck } from "lucide-react";
import { ActivityTimeline } from "./activity-timeline";

interface Contact {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  source: string;
  created_at: string;
  companies: { id: string; name: string; type: string } | null;
}

const SOURCE_LABEL: Record<string, string> = {
  platform: "Platform user",
  email: "Email contact",
  manual: "Manually added",
  chatbot: "Chatbot lead",
};

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/crm/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setTotal(data.total ?? 0);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)]">
      {/* List */}
      <div className="w-96 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${total} contacts…`}
              className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                selected?.id === c.id
                  ? "bg-[var(--surface-secondary)]"
                  : "hover:bg-[var(--surface-secondary)]/60"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0">
                <UserCircle2 className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                  {c.full_name ?? c.email ?? "Unnamed"}
                  {c.user_id && <BadgeCheck className="w-3 h-3 text-[var(--amber)]" />}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] truncate">
                  {c.companies?.name ?? c.email ?? SOURCE_LABEL[c.source]}
                </p>
              </div>
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="p-6 text-center text-xs text-[var(--text-tertiary)]">No contacts found</p>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-y-auto">
        {selected ? (
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                {selected.full_name ?? selected.email ?? "Unnamed contact"}
                {selected.user_id && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--amber)]/15 text-[var(--amber)]">
                    Platform user
                  </span>
                )}
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-[var(--text-secondary)]">
                {selected.email && <p>{selected.email}</p>}
                {selected.phone && <p>{selected.phone}</p>}
                {selected.companies && (
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    {selected.companies.name} ({selected.companies.type})
                  </p>
                )}
                {selected.country_code && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    {selected.country_code}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
                Activity
              </h3>
              <ActivityTimeline
                key={selected.id}
                filter={{ contactId: selected.id }}
                allowNotes
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[var(--text-tertiary)]">Select a contact</p>
          </div>
        )}
      </div>
    </div>
  );
}
