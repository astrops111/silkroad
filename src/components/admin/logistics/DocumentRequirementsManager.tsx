"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Edit, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setDocumentRequirementActive,
  upsertDocumentRequirement,
  type DocumentRequirementInput,
} from "@/lib/actions/document-requirements";
import type {
  DocumentRequirementRow,
  DocumentType,
} from "@/lib/queries/document-requirements";

const DOC_TYPES: DocumentType[] = [
  "commercial_invoice", "packing_list", "bill_of_lading", "air_waybill",
  "certificate_of_origin", "sgs_inspection", "soncap", "pvoc",
  "fumigation", "phytosanitary", "health_certificate", "cites",
  "msds", "dg_declaration", "insurance_certificate",
  "form_e", "form_a", "form_m", "epz_permit",
  "import_license", "tax_id_certificate", "other",
];

type Form = DocumentRequirementInput;

const EMPTY: Form = {
  destinationCountry: "",
  documentType: "commercial_invoice",
  isRequired: true,
  isActive: true,
};

export function DocumentRequirementsManager({
  initialRows,
  portCountries,
}: {
  initialRows: DocumentRequirementRow[];
  portCountries: string[];
}) {
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const countries = useMemo(() => {
    const set = new Set<string>(portCountries);
    for (const r of initialRows) set.add(r.destination_country);
    return [...set].sort();
  }, [initialRows, portCountries]);

  const filtered = useMemo(() => {
    return initialRows.filter((r) => filterCountry === "all" || r.destination_country === filterCountry);
  }, [initialRows, filterCountry]);

  function openCreate() { setForm(EMPTY); setOpen(true); }

  function openEdit(r: DocumentRequirementRow) {
    setForm({
      id: r.id,
      destinationCountry: r.destination_country,
      documentType: r.document_type,
      hsPrefix: r.hs_prefix ?? "",
      shippingMethod: r.shipping_method ?? "",
      containerType: r.container_type ?? "",
      isRequired: r.is_required,
      notes: r.notes ?? "",
      externalUrl: r.external_url ?? "",
      isActive: r.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertDocumentRequirement(form);
      if (!res.success) { toast.error(res.error); return; }
      toast.success(form.id ? "Updated" : "Created");
      setOpen(false);
    });
  }

  function toggleActive(r: DocumentRequirementRow) {
    startTransition(async () => {
      const res = await setDocumentRequirementActive(r.id, !(r.is_active ?? true));
      if (!res.success) toast.error(res.error);
      else toast.success((r.is_active ?? true) ? "Deactivated" : "Activated");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto" />
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Add requirement
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Dest</th>
              <th className="px-3 py-2 text-left">Document</th>
              <th className="px-3 py-2 text-left">Scope</th>
              <th className="px-3 py-2 text-left">Required</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-mono">{r.destination_country}</td>
                <td className="px-3 py-2">{r.document_type.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {[
                    r.hs_prefix && `HS ${r.hs_prefix}`,
                    r.shipping_method,
                    r.container_type,
                  ].filter(Boolean).join(" · ") || "country-wide"}
                </td>
                <td className="px-3 py-2">
                  {r.is_required
                    ? <Badge variant="secondary">required</Badge>
                    : <Badge variant="outline">recommended</Badge>}
                </td>
                <td className="px-3 py-2 max-w-sm truncate text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="px-3 py-2">
                  {(r.is_active ?? true)
                    ? <Badge variant="secondary">Active</Badge>
                    : <Badge variant="outline">Inactive</Badge>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(r)} disabled={pending}>
                    {(r.is_active ?? true) ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No requirements match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit document requirement" : "Add document requirement"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Destination (ISO-2) *">
              <Input value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value.toUpperCase() })} maxLength={2} />
            </Field>
            <Field label="Document type">
              <Select value={form.documentType} onValueChange={(v) => setForm({ ...form, documentType: v as DocumentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="HS prefix (optional)">
              <Input value={form.hsPrefix ?? ""} onChange={(e) => setForm({ ...form, hsPrefix: e.target.value })} placeholder="Leave empty = country-wide" />
            </Field>
            <Field label="Shipping method (optional)">
              <Input value={form.shippingMethod ?? ""} onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })} />
            </Field>
            <Field label="Container type (optional)">
              <Input value={form.containerType ?? ""} onChange={(e) => setForm({ ...form, containerType: e.target.value })} />
            </Field>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isRequired ?? true} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
                Required (vs. recommended)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            </div>
            <Field label="Notes" className="col-span-2">
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label="External URL" className="col-span-2">
              <Input value={form.externalUrl ?? ""} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} placeholder="Link to issuing-authority page or template" />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              {form.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}
