import { formatMoney } from "@/lib/payments/currency-config";

/**
 * Per-step email content for the trade flow. Inline HTML matching the
 * existing transactional style (src/lib/email/index.ts) — brand colours
 * #14110F (obsidian) / #D89F2E (amber).
 */

export interface FlowEmailContext {
  flowNumber: string;
  buyerName: string | null;
  buyerCompanyName: string | null;
  supplierName: string | null;
  goodsSummary: string | null;
  currency: string;
  goodsTotal: number | null;
  shippingCost: number | null;
  grandTotal: number | null;
  shippingFeeDue: number | null;
  paymentInstructions: string | null;
  shippingPaymentInstructions: string | null;
  consigneeCompanyName: string | null;
  consigneeTin: string | null;
  consigneePhone: string | null;
  consigneeEmail: string | null;
  destinationPort: string | null;
  vesselName: string | null;
  seawayBillNumber: string | null;
  etd: string | null;
  eta: string | null;
  note: string | null;
  /** Documents to link in this email (already-released kinds only). */
  documents: Array<{ kind: string; file_url: string | null; file_name: string | null }>;
}

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number | null, currency: string): string {
  return amount === null || amount === undefined ? "—" : formatMoney(amount, currency);
}

function wrap(title: string, flowNumber: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#14110F;">
      <h1 style="margin:0 0 4px 0;font-size:22px;">${esc(title)}</h1>
      <div style="color:#888;font-size:13px;margin-bottom:20px;">Reference ${esc(flowNumber)}</div>
      ${body}
      <p style="margin-top:28px;font-size:12px;color:#888;">
        SilkRoad Africa — this message concerns trade reference ${esc(flowNumber)}.
        Reply to this email if anything looks off.
      </p>
    </div>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;width:170px;color:#666;">${label}</td><td style="font-weight:500;">${value}</td></tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">${rows}</table>`;
}

function panel(html: string): string {
  return `<div style="padding:14px;background:#fafafa;border-radius:8px;margin:12px 0;">${html}</div>`;
}

function preWrap(v: string): string {
  return `<div style="white-space:pre-wrap;line-height:1.5;font-size:13px;color:#333;">${esc(v)}</div>`;
}

function docList(docs: FlowEmailContext["documents"]): string {
  const linked = docs.filter((d) => d.file_url);
  if (!linked.length) return "";
  const items = linked
    .map(
      (d) =>
        `<li style="margin:4px 0;"><a href="${esc(d.file_url)}" style="color:#D89F2E;font-weight:600;">${esc(d.file_name || d.kind)}</a></li>`
    )
    .join("");
  return `<h2 style="font-size:15px;margin:18px 0 6px;">Documents</h2><ul style="margin:0;padding-left:18px;font-size:13px;">${items}</ul>`;
}

function noteBlock(note: string | null): string {
  return note ? panel(preWrap(note)) : "";
}

/* ------------------------------------------------------------------ */
/*  Buyer emails                                                       */
/* ------------------------------------------------------------------ */

export function buyerEmailForStep(
  step: string,
  ctx: FlowEmailContext
): { subject: string; html: string } | null {
  const greeting = `<p style="font-size:14px;">Dear ${esc(ctx.buyerName || ctx.buyerCompanyName || "Customer")},</p>`;

  switch (step) {
    case "started":
      return {
        subject: `We received your request — ${ctx.flowNumber}`,
        html: wrap("Request Received", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Thank you for your request. Our trade team has opened file <b>${esc(ctx.flowNumber)}</b> and is contacting suppliers for a commercial invoice quote. We will send you the invoice with payment details as soon as pricing and shipping costs are confirmed.</p>
          ${ctx.goodsSummary ? panel(preWrap(ctx.goodsSummary)) : ""}
          ${noteBlock(ctx.note)}`),
      };

    case "buyer_invoice_sent":
      return {
        subject: `Your invoice is ready — ${ctx.flowNumber}`,
        html: wrap("Invoice & Payment Details", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Your commercial invoice is ready. Please review the totals below and make payment using the instructions provided to move your order forward.</p>
          ${table(
            row("Goods total", money(ctx.goodsTotal, ctx.currency)) +
            row("Shipping", money(ctx.shippingCost, ctx.currency)) +
            row("Total due", `<b>${money(ctx.grandTotal, ctx.currency)}</b>`)
          )}
          ${ctx.paymentInstructions ? `<h2 style="font-size:15px;margin:18px 0 6px;">Payment Instructions</h2>${panel(preWrap(ctx.paymentInstructions))}` : ""}
          ${docList(ctx.documents)}
          ${noteBlock(ctx.note)}`),
      };

    case "buyer_payment_received":
      return {
        subject: `Payment received — ${ctx.flowNumber}`,
        html: wrap("Payment Confirmed", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">We have received your payment of <b>${money(ctx.grandTotal, ctx.currency)}</b>. We are now placing your order with the supplier and will confirm once production/loading is scheduled.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "supplier_confirmed":
      return {
        subject: `Order confirmed by supplier — ${ctx.flowNumber}`,
        html: wrap("Order Confirmed", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Your order has been placed and the supplier has confirmed receipt of payment. We will notify you when your shipment begins loading, along with the Seaway Bill details.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "shipment_loaded":
      return {
        subject: `Your shipment is loading — ${ctx.flowNumber}`,
        html: wrap("Shipment Loading", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Good news — your shipment is being loaded. Details below:</p>
          ${table(
            row("Vessel", esc(ctx.vesselName)) +
            row("Seaway Bill No.", esc(ctx.seawayBillNumber)) +
            row("Est. departure (ETD)", esc(ctx.etd)) +
            row("Est. arrival (ETA)", esc(ctx.eta)) +
            row("Destination port", esc(ctx.destinationPort))
          )}
          <p style="font-size:13px;color:#666;">We will keep you updated at each stage of transit.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "arrived_transit_port":
      return {
        subject: `Shipment update: arrived at transit port — ${ctx.flowNumber}`,
        html: wrap("Transit Update", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Your shipment has landed at the transit port and has been received by our consignment partner. It is now moving on to <b>${esc(ctx.destinationPort)}</b>${ctx.eta ? `, estimated arrival <b>${esc(ctx.eta)}</b>` : ""}.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "arrived_destination":
      return {
        subject: `Shipment arrived — customs clearance underway — ${ctx.flowNumber}`,
        html: wrap("Arrived at Destination", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Your shipment has arrived at <b>${esc(ctx.destinationPort)}</b> and is entering customs clearance. We will follow up shortly with the shipping/clearance payment request to release your goods.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "shipping_payment_requested":
      return {
        subject: `Action required: shipping payment — ${ctx.flowNumber}`,
        html: wrap("Shipping Payment Request", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Your shipment is ready for release at <b>${esc(ctx.destinationPort)}</b>. Please pay the shipping/clearance charge below. Once payment is confirmed we will release the Seaway Bill and EBM so you can collect your goods.</p>
          ${table(row("Shipping charge due", `<b>${money(ctx.shippingFeeDue, ctx.currency)}</b>`))}
          ${ctx.shippingPaymentInstructions ? `<h2 style="font-size:15px;margin:18px 0 6px;">Payment Instructions</h2>${panel(preWrap(ctx.shippingPaymentInstructions))}` : ""}
          ${noteBlock(ctx.note)}`),
      };

    case "shipping_payment_received":
      return {
        subject: `Shipping payment received — ${ctx.flowNumber}`,
        html: wrap("Shipping Payment Confirmed", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">We have received your shipping payment of <b>${money(ctx.shippingFeeDue, ctx.currency)}</b>. Your release documents (Seaway Bill and EBM) are being prepared and will be sent to you shortly.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "completed":
      return {
        subject: `Documents released: Seaway Bill & EBM — ${ctx.flowNumber}`,
        html: wrap("Documents Released", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">All payments are confirmed. Please find your release documents — the <b>Seaway Bill</b> and <b>EBM</b> — below. Present these to collect your goods at ${esc(ctx.destinationPort)}. Thank you for trading with us.</p>
          ${docList(ctx.documents)}
          ${table(
            row("Seaway Bill No.", esc(ctx.seawayBillNumber)) +
            row("Vessel", esc(ctx.vesselName)) +
            row("Destination port", esc(ctx.destinationPort))
          )}
          ${noteBlock(ctx.note)}`),
      };

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Supplier emails                                                    */
/* ------------------------------------------------------------------ */

export function supplierEmailForStep(
  step: string,
  ctx: FlowEmailContext
): { subject: string; html: string } | null {
  const greeting = `<p style="font-size:14px;">Dear ${esc(ctx.supplierName || "Partner")},</p>`;

  switch (step) {
    case "supplier_quote_requested":
      return {
        subject: `Quote request (commercial invoice) — ${ctx.flowNumber}`,
        html: wrap("Request for Commercial Invoice Quote", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">Please provide a commercial invoice quote <b>including shipping cost</b> to the destination below for the following goods:</p>
          ${ctx.goodsSummary ? panel(preWrap(ctx.goodsSummary)) : ""}
          <h2 style="font-size:15px;margin:18px 0 6px;">Consignment Information</h2>
          ${table(
            row("Company name", esc(ctx.consigneeCompanyName)) +
            row("TIN", esc(ctx.consigneeTin)) +
            row("Phone", esc(ctx.consigneePhone)) +
            row("Email", esc(ctx.consigneeEmail)) +
            row("Port of destination", esc(ctx.destinationPort))
          )}
          <p style="font-size:13px;color:#666;">Please reply with your commercial invoice showing goods value and shipping cost.</p>
          ${noteBlock(ctx.note)}`),
      };

    case "supplier_order_placed":
      return {
        subject: `Order placed — payment forwarded — ${ctx.flowNumber}`,
        html: wrap("Order Confirmation & Payment", ctx.flowNumber, `
          ${greeting}
          <p style="font-size:14px;line-height:1.6;">We confirm the order against your invoice and have forwarded payment of <b>${money(ctx.grandTotal, ctx.currency)}</b>. Please confirm receipt, and send the <b>Seaway Bill</b> when the shipment is loading.</p>
          ${table(
            row("Consignee", esc(ctx.consigneeCompanyName)) +
            row("TIN", esc(ctx.consigneeTin)) +
            row("Port of destination", esc(ctx.destinationPort))
          )}
          ${docList(ctx.documents)}
          ${noteBlock(ctx.note)}`),
      };

    default:
      return null;
  }
}
