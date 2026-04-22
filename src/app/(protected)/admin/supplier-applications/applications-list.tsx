"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSupplierApplicationStatus } from "@/lib/actions/supplier-applications";

type Status = "pending" | "in_review" | "approved" | "rejected" | "contacted";

interface Row {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  company_name_local: string | null;
  country_code: string | null;
  city: string | null;
  website: string | null;
  years_in_business: string | null;
  employee_range: string | null;
  product_categories: string[] | null;
  products_description: string;
  monthly_capacity: string | null;
  existing_markets: string | null;
  certifications: string | null;
  sample_available: boolean | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/20",
  in_review: "bg-[var(--indigo)]/15 text-[var(--indigo)] border-[var(--indigo)]/20",
  contacted: "bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/15",
  approved: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20",
  rejected: "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/20",
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ApplicationsList({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [acting, setActing] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setStatus(r: Row, status: Status) {
    setActing(r.id);
    startTransition(async () => {
      const res = await updateSupplierApplicationStatus(
        r.id,
        status,
        notesDraft[r.id]
      );
      setActing(null);
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success(`Marked as ${status.replace("_", " ")}`);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)]">
        <Package className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">
          No applications in this bucket
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const open = expanded.has(r.id);
        const age = new Date(r.created_at).toLocaleString();
        return (
          <li
            key={r.id}
            className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden"
          >
            <div className="flex items-start gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--amber-glow)] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[var(--amber-dark)]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--text-primary)] truncate">
                    {r.company_name}
                  </p>
                  {r.company_name_local && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {r.company_name_local}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                      STATUS_BADGE[r.status] ??
                      "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-default)]"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)] mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {r.email}
                  </span>
                  {r.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {r.phone}
                    </span>
                  )}
                  {r.country_code && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {r.country_code}
                      {r.city ? ` · ${r.city}` : ""}
                    </span>
                  )}
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[var(--amber-dark)]"
                    >
                      <Globe className="w-3 h-3" />
                      {r.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <span>· {age}</span>
                </div>

                {r.product_categories && r.product_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.product_categories.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c.replace(/^other:/, "")}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={r.status}
                  onValueChange={(v) => setStatus(r, v as Status)}
                  disabled={pending && acting === r.id}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {acting === r.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggle(r.id)}
                >
                  {open ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {open && (
              <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">
                      Contact
                    </p>
                    <p className="text-[var(--text-primary)] font-medium">
                      {r.full_name}
                    </p>
                  </div>
                  {r.years_in_business && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">
                        Years in business
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {r.years_in_business}
                      </p>
                    </div>
                  )}
                  {r.employee_range && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">
                        Employees
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {r.employee_range}
                      </p>
                    </div>
                  )}
                  {r.monthly_capacity && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">
                        Monthly capacity
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {r.monthly_capacity}
                      </p>
                    </div>
                  )}
                  {r.existing_markets && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">
                        Existing markets
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {r.existing_markets}
                      </p>
                    </div>
                  )}
                  {r.certifications && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">
                        Certifications
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {r.certifications}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">
                    Products
                  </p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {r.products_description}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">
                    Admin notes
                  </p>
                  <textarea
                    defaultValue={r.admin_notes ?? ""}
                    onBlur={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Internal notes — saved on next status change"
                    className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)]"
                  />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
