"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitResourceQuote } from "@/lib/actions/resources-rfq";

interface SupplierOption {
  id: string;
  name: string;
  tier: string;
  isPaid: boolean;
}

interface Props {
  rfqId: string;
  rfqDefaults: {
    quantity: number | null;
    unitOfMeasure: string | null;
    incoterm: string | null;
    portOfLoading: string | null;
    portOfDischarge: string | null;
    paymentInstrument: string | null;
  };
  supplierCompanies: SupplierOption[];
  labels: {
    supplier: string;
    unitPrice: string;
    quantity: string;
    uom: string;
    incoterm: string;
    loadPort: string;
    dischargePort: string;
    leadTime: string;
    validity: string;
    payment: string;
    inspection: string;
    notes: string;
    submit: string;
    submitting: string;
    total: string;
    freeTierBlock: string;
  };
}

const INCOTERMS = ["fob", "cif", "cfr", "dap", "exw"] as const;
const INSTRUMENTS = ["lc_at_sight", "lc_usance", "tt_advance", "tt_against_docs"] as const;
const AGENCIES = ["SGS", "BV", "Intertek", "CCIC"] as const;

export function ResourceQuoteForm({
  rfqId,
  rfqDefaults,
  supplierCompanies,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const paidSuppliers = supplierCompanies.filter((s) => s.isPaid);
  const canSubmit = paidSuppliers.length > 0;

  const [form, setForm] = useState({
    supplierCompanyId: paidSuppliers[0]?.id ?? "",
    unitPrice: "",
    quantity: rfqDefaults.quantity?.toString() ?? "",
    unitOfMeasure: rfqDefaults.unitOfMeasure ?? "MT",
    incoterm: (rfqDefaults.incoterm ?? "fob") as (typeof INCOTERMS)[number],
    portOfLoading: rfqDefaults.portOfLoading ?? "",
    portOfDischarge: rfqDefaults.portOfDischarge ?? "",
    leadTimeDays: "",
    validityDays: "30",
    paymentInstrument: (rfqDefaults.paymentInstrument ??
      "lc_at_sight") as (typeof INSTRUMENTS)[number],
    inspectionAgency: "SGS" as (typeof AGENCIES)[number],
    notes: "",
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const totalUsd = useMemo(() => {
    const price = Number(form.unitPrice);
    const qty = Number(form.quantity);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return null;
    return price * qty;
  }, [form.unitPrice, form.quantity]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    start(async () => {
      const result = await submitResourceQuote({
        rfqId,
        supplierCompanyId: form.supplierCompanyId,
        unitPriceUsd: Number(form.unitPrice),
        quantity: Number(form.quantity),
        unitOfMeasure: form.unitOfMeasure,
        incoterm: form.incoterm,
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
        validityDays: form.validityDays ? Number(form.validityDays) : undefined,
        paymentInstrument: form.paymentInstrument,
        inspectionAgency: form.inspectionAgency,
        notes: form.notes || undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to submit quote");
        return;
      }
      router.push(`/resources/rfqs/${rfqId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {!canSubmit && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {labels.freeTierBlock}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {paidSuppliers.length > 1 && (
        <Field label={labels.supplier}>
          <select
            className="input"
            value={form.supplierCompanyId}
            onChange={(e) => setField("supplierCompanyId", e.target.value)}
          >
            {paidSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.tier})
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Field label={labels.unitPrice}>
          <input
            className="input"
            type="number"
            step="0.0001"
            min="0"
            value={form.unitPrice}
            onChange={(e) => setField("unitPrice", e.target.value)}
            required
          />
        </Field>
        <Field label={labels.quantity}>
          <input
            className="input"
            type="number"
            step="0.001"
            min="0"
            value={form.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            required
          />
        </Field>
        <Field label={labels.uom}>
          <select
            className="input"
            value={form.unitOfMeasure}
            onChange={(e) => setField("unitOfMeasure", e.target.value)}
          >
            {["MT", "BDMT", "m3", "troy_oz", "kg", "TEU"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {totalUsd != null && totalUsd > 0 && (
        <div className="rounded-md bg-white/5 px-4 py-3 text-sm">
          <span className="text-slate-400">{labels.total}:</span>{" "}
          <span className="font-semibold">
            ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Field label={labels.incoterm}>
          <select
            className="input"
            value={form.incoterm}
            onChange={(e) =>
              setField("incoterm", e.target.value as typeof form.incoterm)
            }
          >
            {INCOTERMS.map((i) => (
              <option key={i} value={i}>
                {i.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.loadPort}>
          <input
            className="input"
            value={form.portOfLoading}
            onChange={(e) => setField("portOfLoading", e.target.value)}
          />
        </Field>
        <Field label={labels.dischargePort}>
          <input
            className="input"
            value={form.portOfDischarge}
            onChange={(e) => setField("portOfDischarge", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label={labels.leadTime}>
          <input
            className="input"
            type="number"
            min="0"
            value={form.leadTimeDays}
            onChange={(e) => setField("leadTimeDays", e.target.value)}
          />
        </Field>
        <Field label={labels.validity}>
          <input
            className="input"
            type="number"
            min="1"
            value={form.validityDays}
            onChange={(e) => setField("validityDays", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label={labels.payment}>
          <select
            className="input"
            value={form.paymentInstrument}
            onChange={(e) =>
              setField(
                "paymentInstrument",
                e.target.value as typeof form.paymentInstrument
              )
            }
          >
            <option value="lc_at_sight">LC at sight</option>
            <option value="lc_usance">LC usance</option>
            <option value="tt_advance">T/T advance</option>
            <option value="tt_against_docs">T/T against docs</option>
          </select>
        </Field>
        <Field label={labels.inspection}>
          <select
            className="input"
            value={form.inspectionAgency}
            onChange={(e) =>
              setField(
                "inspectionAgency",
                e.target.value as typeof form.inspectionAgency
              )
            }
          >
            {AGENCIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={labels.notes}>
        <textarea
          className="input min-h-[80px]"
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </Field>

      <div>
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="px-6 py-3 rounded-md bg-[var(--amber)] text-black font-medium disabled:opacity-50"
        >
          {pending ? labels.submitting : labels.submit}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
          border-radius: 6px;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: rgba(216, 159, 46, 0.5);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}
