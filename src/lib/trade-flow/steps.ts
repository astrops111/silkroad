/**
 * Trade-flow state machine — the admin-mediated buy process:
 *
 *  1. started                     buyer sent an RFQ or order
 *  2. supplier_quote_requested    admin forwarded quote request + consignment
 *                                 info (company/TIN/phone/email, destination
 *                                 port) to the supplier
 *  3. supplier_invoice_received   supplier returned commercial invoice with
 *                                 shipping cost
 *  4. buyer_invoice_sent          admin forwarded invoice + payment info to
 *                                 the buyer
 *  5. buyer_payment_received      buyer paid; admin confirmed receipt
 *  6. supplier_order_placed       admin placed the order with the supplier
 *                                 and forwarded payment
 *  7. supplier_confirmed          supplier confirmed payment receipt
 *  8. shipment_loaded             loading started; seaway bill received;
 *                                 buyer notified
 *  9. arrived_transit_port        shipment landed at transit port, received
 *                                 from consignment partner; buyer updated
 * 10. arrived_destination         arrived at destination; clearance notice
 *                                 received
 * 11. shipping_payment_requested  admin sent shipping/clearance payment
 *                                 request to buyer
 * 12. shipping_payment_received   buyer paid the shipping fee
 * 13. completed                   admin released seaway bill + EBM to buyer
 *
 * Steps advance strictly in order (admin-driven); `cancelled` is reachable
 * from any non-terminal step. Step keys mirror the current_step CHECK in
 * supabase/migrations/00134_trade_flows.sql.
 */

export const TRADE_FLOW_STEPS = [
  "started",
  "supplier_quote_requested",
  "supplier_invoice_received",
  "buyer_invoice_sent",
  "buyer_payment_received",
  "supplier_order_placed",
  "supplier_confirmed",
  "shipment_loaded",
  "arrived_transit_port",
  "arrived_destination",
  "shipping_payment_requested",
  "shipping_payment_received",
  "completed",
] as const;

export type TradeFlowStep = (typeof TRADE_FLOW_STEPS)[number] | "cancelled";

export interface TradeFlowStepDef {
  key: TradeFlowStep;
  label: string;
  /** What the admin is recording when advancing INTO this step. */
  description: string;
  /** Who the notification goes to when this step is reached. */
  notifies: Array<"buyer" | "supplier" | "ops">;
  /** trade_flows columns the advance form collects for this step. */
  fields: string[];
  /** Document kinds usually attached at this step. */
  documents: string[];
}

export const STEP_DEFS: Record<string, TradeFlowStepDef> = {
  started: {
    key: "started",
    label: "Request Received",
    description: "Buyer sent an RFQ or order — flow opened.",
    notifies: ["ops", "buyer"],
    fields: [],
    documents: [],
  },
  supplier_quote_requested: {
    key: "supplier_quote_requested",
    label: "Quote Requested from Supplier",
    description:
      "Commercial invoice quote requested from the supplier, with consignment info (company, TIN, phone, email) and destination port.",
    notifies: ["supplier", "ops"],
    fields: [
      "supplier_name",
      "supplier_email",
      "consignee_company_name",
      "consignee_tin",
      "consignee_phone",
      "consignee_email",
      "destination_port",
      "goods_summary",
    ],
    documents: ["quote_request"],
  },
  supplier_invoice_received: {
    key: "supplier_invoice_received",
    label: "Supplier Invoice Received",
    description: "Supplier sent back the commercial invoice including shipping cost.",
    notifies: ["ops"],
    fields: ["goods_total", "shipping_cost", "grand_total", "currency"],
    documents: ["supplier_invoice"],
  },
  buyer_invoice_sent: {
    key: "buyer_invoice_sent",
    label: "Invoice Sent to Buyer",
    description: "Invoice forwarded to the buyer with payment information added.",
    notifies: ["buyer", "ops"],
    fields: ["grand_total", "currency", "payment_instructions"],
    documents: ["buyer_invoice"],
  },
  buyer_payment_received: {
    key: "buyer_payment_received",
    label: "Buyer Payment Received",
    description: "Buyer's payment received and confirmed.",
    notifies: ["buyer", "ops"],
    fields: [],
    documents: ["buyer_payment_proof"],
  },
  supplier_order_placed: {
    key: "supplier_order_placed",
    label: "Order Placed with Supplier",
    description: "Order placed with the supplier and payment forwarded.",
    notifies: ["supplier", "ops"],
    fields: [],
    documents: ["supplier_payment_proof"],
  },
  supplier_confirmed: {
    key: "supplier_confirmed",
    label: "Supplier Confirmed Receipt",
    description: "Supplier confirmed payment receipt; preparing shipment.",
    notifies: ["buyer", "ops"],
    fields: [],
    documents: [],
  },
  shipment_loaded: {
    key: "shipment_loaded",
    label: "Shipment Loading",
    description: "Shipment loading — Seaway Bill received from supplier; buyer notified.",
    notifies: ["buyer", "ops"],
    fields: ["vessel_name", "seaway_bill_number", "etd", "eta"],
    documents: ["seaway_bill"],
  },
  arrived_transit_port: {
    key: "arrived_transit_port",
    label: "Arrived at Transit Port",
    description:
      "Shipment landed at the transit port and was received from the consignment partner; buyer updated.",
    notifies: ["buyer", "ops"],
    fields: ["eta"],
    documents: [],
  },
  arrived_destination: {
    key: "arrived_destination",
    label: "Arrived at Destination",
    description: "Shipment arrived at the destination port — clearance notice received.",
    notifies: ["buyer", "ops"],
    fields: [],
    documents: [],
  },
  shipping_payment_requested: {
    key: "shipping_payment_requested",
    label: "Shipping Payment Requested",
    description: "Shipping/clearance payment request sent to the buyer.",
    notifies: ["buyer", "ops"],
    fields: ["shipping_fee_due", "shipping_payment_instructions"],
    documents: [],
  },
  shipping_payment_received: {
    key: "shipping_payment_received",
    label: "Shipping Payment Received",
    description: "Buyer's shipping payment received and confirmed.",
    notifies: ["buyer", "ops"],
    fields: [],
    documents: ["buyer_payment_proof"],
  },
  completed: {
    key: "completed",
    label: "Documents Released",
    description: "Seaway Bill and EBM sent to the buyer — flow complete.",
    notifies: ["buyer", "ops"],
    fields: [],
    documents: ["seaway_bill", "ebm"],
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    description: "Flow cancelled.",
    notifies: ["ops"],
    fields: [],
    documents: [],
  },
};

/** The single valid next step, or null when terminal. */
export function nextStep(current: string): TradeFlowStep | null {
  const idx = TRADE_FLOW_STEPS.indexOf(current as (typeof TRADE_FLOW_STEPS)[number]);
  if (idx === -1 || idx === TRADE_FLOW_STEPS.length - 1) return null;
  return TRADE_FLOW_STEPS[idx + 1];
}

export function isTerminal(step: string): boolean {
  return step === "completed" || step === "cancelled";
}

export function stepIndex(step: string): number {
  return TRADE_FLOW_STEPS.indexOf(step as (typeof TRADE_FLOW_STEPS)[number]);
}
