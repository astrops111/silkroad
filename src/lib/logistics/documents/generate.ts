import type { CargoItem, CostBreakdown } from "@/lib/logistics/landed-cost";

// Data bundle passed into every document generator. Kept deliberately
// presentation-agnostic — the same bundle could later feed a PDF generator.
export interface ShipmentDocContext {
  shipmentNumber: string;
  issuedAt: Date;

  seller: {
    name: string;
    address?: string;
    taxId?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  buyer: {
    name: string;
    company?: string;
    country?: string;
    address?: string;
    email?: string;
    phone?: string;
  };

  routing: {
    originCountry?: string;
    originPort?: string;
    destinationCountry?: string;
    destinationPort?: string;
    shippingMethod: string;
    containerType?: string;
    tradeTerm?: string;
  };

  cargo: {
    items: CargoItem[];
    totalWeightKg: number | null;
    totalVolumeCbm: number | null;
    packageCount: number | null;
    isFragile: boolean;
    requiresColdChain: boolean;
    isHazardous: boolean;
    hsCodes: string[];
    description?: string;
  };

  money: {
    currency: string;
    goodsValueMinor: number;
    totalQuotedMinor: number | null;
    breakdown: CostBreakdown | null;
  };
}

export interface GeneratedDocument {
  kind: "commercial_invoice" | "packing_list";
  title: string;
  html: string;   // print-ready HTML (self-contained styles)
  filename: string;
}

// ============================================================
// Commercial invoice
// ============================================================

export function generateCommercialInvoice(ctx: ShipmentDocContext): GeneratedDocument {
  const fmtMoney = (minor: number, ccy = ctx.money.currency) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, currencyDisplay: "code" })
      .format(minor / 100);
  const issued = ctx.issuedAt.toISOString().slice(0, 10);

  const itemRows = ctx.cargo.items
    .map((it, i) => {
      const lineMinor = it.unitCostMinor * it.quantity;
      return `<tr>
        <td>${i + 1}</td>
        <td>${escape(it.description)}</td>
        <td>${escape(it.hsCode)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${fmtMoney(it.unitCostMinor)}</td>
        <td class="num">${fmtMoney(lineMinor)}</td>
      </tr>`;
    })
    .join("");

  const totalMinor = ctx.cargo.items.reduce((s, i) => s + i.unitCostMinor * i.quantity, 0);
  const routeLine = `${ctx.routing.originPort ?? ctx.routing.originCountry ?? "—"} → ${ctx.routing.destinationPort ?? ctx.routing.destinationCountry ?? "—"}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Commercial Invoice ${ctx.shipmentNumber}</title>
<style>${PRINT_CSS}</style>
</head><body>
<div class="doc">
  <header>
    <h1>Commercial Invoice</h1>
    <div class="meta">
      <div><b>No.</b> ${ctx.shipmentNumber}</div>
      <div><b>Issued</b> ${issued}</div>
    </div>
  </header>
  <section class="two">
    <div><h3>Seller / Shipper</h3>
      <p><b>${escape(ctx.seller.name)}</b></p>
      ${ctx.seller.address ? `<p>${escape(ctx.seller.address)}</p>` : ""}
      ${ctx.seller.taxId ? `<p>Tax ID: ${escape(ctx.seller.taxId)}</p>` : ""}
    </div>
    <div><h3>Buyer / Consignee</h3>
      <p><b>${escape(ctx.buyer.company ?? ctx.buyer.name)}</b></p>
      ${ctx.buyer.name && ctx.buyer.company ? `<p>Attn: ${escape(ctx.buyer.name)}</p>` : ""}
      ${ctx.buyer.address ? `<p>${escape(ctx.buyer.address)}</p>` : ""}
      ${ctx.buyer.country ? `<p>${escape(ctx.buyer.country)}</p>` : ""}
    </div>
  </section>
  <section class="grid4">
    <div><h4>Route</h4>${routeLine}</div>
    <div><h4>Method</h4>${escape(ctx.routing.shippingMethod)}</div>
    <div><h4>Trade term</h4>${escape(ctx.routing.tradeTerm?.toUpperCase() ?? "—")}</div>
    <div><h4>Container</h4>${escape(ctx.routing.containerType ?? "—")}</div>
  </section>
  <table class="lines">
    <thead><tr><th>#</th><th>Description</th><th>HS</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr><td colspan="5" class="num"><b>Goods total</b></td><td class="num"><b>${fmtMoney(totalMinor)}</b></td></tr>
    </tfoot>
  </table>
  ${ctx.money.breakdown ? renderCostFooter(ctx, fmtMoney) : ""}
  <footer>
    <p class="small">We hereby declare the above particulars are true and correct.</p>
  </footer>
</div>
</body></html>`;

  return {
    kind: "commercial_invoice",
    title: `Commercial Invoice — ${ctx.shipmentNumber}`,
    html,
    filename: `commercial-invoice-${ctx.shipmentNumber}.html`,
  };
}

// ============================================================
// Packing list
// ============================================================

export function generatePackingList(ctx: ShipmentDocContext): GeneratedDocument {
  const issued = ctx.issuedAt.toISOString().slice(0, 10);
  const itemRows = ctx.cargo.items
    .map((it, i) => {
      const totalKg = it.weightKgPerUnit * it.quantity;
      const totalCbm = (it.volumeCbmPerUnit ?? 0) * it.quantity;
      const flags = [
        it.isFragile && "fragile",
        it.requiresColdChain && "cold chain",
        it.isHazardous && "hazmat",
      ].filter(Boolean).join(", ");
      return `<tr>
        <td>${i + 1}</td>
        <td>${escape(it.description)}</td>
        <td>${escape(it.hsCode)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${it.weightKgPerUnit.toFixed(2)}</td>
        <td class="num">${totalKg.toFixed(2)}</td>
        <td class="num">${(it.volumeCbmPerUnit ?? 0).toFixed(4)}</td>
        <td class="num">${totalCbm.toFixed(4)}</td>
        <td class="small">${escape(flags)}</td>
      </tr>`;
    })
    .join("");

  const routeLine = `${ctx.routing.originPort ?? ctx.routing.originCountry ?? "—"} → ${ctx.routing.destinationPort ?? ctx.routing.destinationCountry ?? "—"}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Packing List ${ctx.shipmentNumber}</title>
<style>${PRINT_CSS}</style>
</head><body>
<div class="doc">
  <header>
    <h1>Packing List</h1>
    <div class="meta">
      <div><b>No.</b> ${ctx.shipmentNumber}</div>
      <div><b>Issued</b> ${issued}</div>
    </div>
  </header>
  <section class="two">
    <div><h3>Shipper</h3>
      <p><b>${escape(ctx.seller.name)}</b></p>
      ${ctx.seller.address ? `<p>${escape(ctx.seller.address)}</p>` : ""}
    </div>
    <div><h3>Consignee</h3>
      <p><b>${escape(ctx.buyer.company ?? ctx.buyer.name)}</b></p>
      ${ctx.buyer.address ? `<p>${escape(ctx.buyer.address)}</p>` : ""}
    </div>
  </section>
  <section class="grid4">
    <div><h4>Route</h4>${routeLine}</div>
    <div><h4>Method</h4>${escape(ctx.routing.shippingMethod)}</div>
    <div><h4>Packages</h4>${ctx.cargo.packageCount ?? "—"}</div>
    <div><h4>Total weight</h4>${ctx.cargo.totalWeightKg ?? "—"} kg</div>
  </section>
  <table class="lines">
    <thead><tr>
      <th>#</th><th>Description</th><th>HS</th>
      <th class="num">Qty</th>
      <th class="num">kg/unit</th><th class="num">Total kg</th>
      <th class="num">CBM/unit</th><th class="num">Total CBM</th>
      <th>Handling</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>
</body></html>`;

  return {
    kind: "packing_list",
    title: `Packing List — ${ctx.shipmentNumber}`,
    html,
    filename: `packing-list-${ctx.shipmentNumber}.html`,
  };
}

// ============================================================
// Shared: cost breakdown footer for invoice
// ============================================================

function renderCostFooter(ctx: ShipmentDocContext, fmtMoney: (n: number) => string): string {
  const b = ctx.money.breakdown!;
  const rows: string[] = [];
  const add = (label: string, val: number, note?: string) => {
    if (val > 0) rows.push(`<tr><td>${escape(label)}${note ? ` <span class="small">(${escape(note)})</span>` : ""}</td><td class="num">${fmtMoney(val)}</td></tr>`);
  };
  add("First-mile", b.firstMile.amountMinor);
  add("Main-leg freight", b.mainLeg.amountMinor);
  add("Insurance", b.insurance.amountMinor);
  add("Duty", b.duty.amountMinor);
  add("VAT", b.vat.amountMinor);
  add("Excise", b.excise.amountMinor);
  add("Other fees", b.otherFees.amountMinor);
  add("Last-mile", b.lastMile.amountMinor);
  add("Platform handling", b.handling.amountMinor);
  if (b.markupMinor > 0) rows.push(`<tr><td>Platform markup</td><td class="num">${fmtMoney(b.markupMinor)}</td></tr>`);

  return `<table class="totals">
    <tbody>
      <tr><td>Goods subtotal</td><td class="num">${fmtMoney(b.goods.amountMinor)}</td></tr>
      ${rows.join("")}
      <tr class="grand"><td><b>Total to buyer (${escape(b.incoterm.toUpperCase())})</b></td><td class="num"><b>${fmtMoney(b.totalMinor)}</b></td></tr>
    </tbody>
  </table>`;
}

function escape(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; }
  .doc { max-width: 820px; margin: 2rem auto; padding: 2rem; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 0.5rem; margin-bottom: 1.25rem; }
  header h1 { margin: 0; font-size: 1.5rem; letter-spacing: 0.04em; text-transform: uppercase; }
  header .meta { text-align: right; font-size: 0.9rem; }
  section.two { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1rem; }
  section.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin: 1rem 0; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; }
  section.grid4 h4 { margin: 0 0 0.2rem 0; font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
  h3 { font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.4rem 0; }
  table.lines { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.88rem; }
  table.lines th { text-align: left; border-bottom: 2px solid #111; padding: 0.4rem 0.3rem; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }
  table.lines td { border-bottom: 1px solid #eee; padding: 0.35rem 0.3rem; }
  table.lines tfoot td { border: none; padding-top: 0.75rem; }
  table.totals { width: 320px; margin: 1rem 0 0 auto; font-size: 0.9rem; }
  table.totals td { padding: 0.3rem 0.4rem; border-bottom: 1px solid #eee; }
  table.totals tr.grand td { border-top: 2px solid #111; border-bottom: none; font-size: 1rem; padding-top: 0.5rem; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 0.75rem; color: #666; }
  footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; }
  @media print {
    .doc { margin: 0; padding: 1rem; max-width: 100%; }
    header { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
  }
`;
