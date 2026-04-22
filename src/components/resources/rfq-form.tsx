"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createResourceRfq } from "@/lib/actions/resources-rfq";

interface CompanyOption {
  id: string;
  name: string;
  tier: string;
  isPaid: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  uom: string;
}

interface Props {
  buyerCompanies: CompanyOption[];
  categories: CategoryOption[];
  prefillCommodityId?: string;
  labels: {
    title: string;
    description: string;
    category: string;
    quantity: string;
    uom: string;
    targetPrice: string;
    incoterm: string;
    loadPort: string;
    dischargePort: string;
    windowStart: string;
    windowEnd: string;
    payment: string;
    buyer: string;
    submit: string;
    submitting: string;
    success: string;
  };
}

const INCOTERMS = ["fob", "cif", "cfr", "dap", "exw"] as const;
const INSTRUMENTS = [
  "lc_at_sight",
  "lc_usance",
  "tt_advance",
  "tt_against_docs",
] as const;

export function ResourceRfqForm({
  buyerCompanies,
  categories,
  prefillCommodityId,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const paidCompanies = buyerCompanies.filter((c) => c.isPaid);
  const canSubmit = paidCompanies.length > 0;

  const [form, setForm] = useState({
    buyerCompanyId: paidCompanies[0]?.id ?? "",
    title: "",
    description: "",
    resourceCategoryId: categories[0]?.id ?? "",
    quantity: "",
    unitOfMeasure: categories[0]?.uom ?? "MT",
    targetPrice: "",
    incoterm: "fob" as (typeof INCOTERMS)[number],
    portOfLoading: "",
    portOfDischarge: "",
    shipmentWindowStart: "",
    shipmentWindowEnd: "",
    paymentInstrument: "lc_at_sight" as (typeof INSTRUMENTS)[number],
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onCategoryChange(id: string) {
    const cat = categories.find((c) => c.id === id);
    setForm((f) => ({
      ...f,
      resourceCategoryId: id,
      unitOfMeasure: cat?.uom ?? f.unitOfMeasure,
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    start(async () => {
      const result = await createResourceRfq({
        buyerCompanyId: form.buyerCompanyId,
        title: form.title,
        description: form.description || undefined,
        resourceCategoryId: form.resourceCategoryId || undefined,
        commodityId: prefillCommodityId,
        quantity: Number(form.quantity),
        unitOfMeasure: form.unitOfMeasure,
        targetPricePerUnitUsd: form.targetPrice
          ? Number(form.targetPrice)
          : undefined,
        incoterm: form.incoterm,
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        shipmentWindowStart: form.shipmentWindowStart || undefined,
        shipmentWindowEnd: form.shipmentWindowEnd || undefined,
        paymentInstrument: form.paymentInstrument,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to create RFQ");
        return;
      }
      router.push(`/resources/rfqs/${result.data!.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {!canSubmit && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          You do not have a paid-tier buyer company. Create or upgrade one
          before submitting an RFQ.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {paidCompanies.length > 1 && (
        <Field label={labels.buyer}>
          <select
            className="input"
            value={form.buyerCompanyId}
            onChange={(e) => setField("buyerCompanyId", e.target.value)}
          >
            {paidCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.tier})
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={labels.title}>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          required
        />
      </Field>

      <Field label={labels.description}>
        <textarea
          className="input min-h-[80px]"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label={labels.category}>
          <select
            className="input"
            value={form.resourceCategoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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

      <div className="grid md:grid-cols-2 gap-4">
        <Field label={labels.quantity}>
          <input
            className="input"
            type="number"
            min="0"
            step="0.001"
            value={form.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            required
          />
        </Field>
        <Field label={labels.targetPrice}>
          <input
            className="input"
            type="number"
            min="0"
            step="0.0001"
            placeholder="USD / unit"
            value={form.targetPrice}
            onChange={(e) => setField("targetPrice", e.target.value)}
          />
        </Field>
      </div>

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
            placeholder="e.g. ZADUR"
            value={form.portOfLoading}
            onChange={(e) => setField("portOfLoading", e.target.value)}
          />
        </Field>
        <Field label={labels.dischargePort}>
          <input
            className="input"
            placeholder="e.g. CNSHA"
            value={form.portOfDischarge}
            onChange={(e) => setField("portOfDischarge", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label={labels.windowStart}>
          <input
            className="input"
            type="date"
            value={form.shipmentWindowStart}
            onChange={(e) => setField("shipmentWindowStart", e.target.value)}
          />
        </Field>
        <Field label={labels.windowEnd}>
          <input
            className="input"
            type="date"
            value={form.shipmentWindowEnd}
            onChange={(e) => setField("shipmentWindowEnd", e.target.value)}
          />
        </Field>
      </div>

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
          <option value="lc_at_sight">Letter of Credit — at sight</option>
          <option value="lc_usance">Letter of Credit — usance</option>
          <option value="tt_advance">T/T advance</option>
          <option value="tt_against_docs">T/T against documents</option>
        </select>
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
