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
  setPortActive,
  upsertPort,
  type PortInput,
} from "@/lib/actions/logistics-reference";
import type { PortRow, PortType } from "@/lib/queries/logistics-reference";

type Form = Omit<PortInput, "portType"> & { portType: PortType };

const EMPTY: Form = {
  code: "",
  name: "",
  country: "",
  city: "",
  portType: "sea",
  region: "",
  isOrigin: false,
  isDestination: false,
  isActive: true,
};

const PORT_TYPES: PortType[] = ["sea", "air", "inland", "rail"];

export function PortsManager({ initialPorts }: { initialPorts: PortRow[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialPorts;
    return initialPorts.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q),
    );
  }, [initialPorts, query]);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: PortRow) {
    setForm({
      id: p.id,
      code: p.code,
      name: p.name,
      country: p.country,
      city: p.city ?? "",
      portType: p.port_type,
      region: p.region ?? "",
      latitude: p.latitude ?? undefined,
      longitude: p.longitude ?? undefined,
      isOrigin: p.is_origin ?? false,
      isDestination: p.is_destination ?? false,
      isActive: p.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertPort(form);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Port updated" : "Port created");
      setOpen(false);
    });
  }

  function toggleActive(p: PortRow) {
    startTransition(async () => {
      const res = await setPortActive(p.id, !p.is_active);
      if (!res.success) toast.error(res.error);
      else toast.success(p.is_active ? "Deactivated" : "Activated");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search code / name / country / city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto" />
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Add port
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Use</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono">{p.code}</td>
                <td className="px-3 py-2">
                  {p.name}
                  {p.city && p.city !== p.name ? (
                    <span className="ml-1 text-xs text-muted-foreground">({p.city})</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{p.country}</td>
                <td className="px-3 py-2">{p.port_type}</td>
                <td className="px-3 py-2">
                  {(p.is_origin ?? false) && <Badge variant="outline" className="mr-1">origin</Badge>}
                  {(p.is_destination ?? false) && <Badge variant="outline">destination</Badge>}
                </td>
                <td className="px-3 py-2">
                  {(p.is_active ?? true) ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(p)} disabled={pending}>
                    {(p.is_active ?? true) ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No ports match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit port" : "Add port"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Code (UN/LOCODE)">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="CNSHA"
              />
            </Field>
            <Field label="Country (ISO-2)">
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                placeholder="CN"
                maxLength={2}
              />
            </Field>
            <Field label="Name" className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select value={form.portType} onValueChange={(v) => setForm({ ...form, portType: v as PortType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Region">
              <Input
                value={form.region ?? ""}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="cn / africa_east / etc."
              />
            </Field>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isOrigin ?? false}
                  onChange={(e) => setForm({ ...form, isOrigin: e.target.checked })}
                />
                Origin (Asia-side)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDestination ?? false}
                  onChange={(e) => setForm({ ...form, isDestination: e.target.checked })}
                />
                Destination (Africa-side)
              </label>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
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
