"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus } from "@/lib/auth/tier";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
  code?:
    | "unauthorized"
    | "paid_tier_required"
    | "invalid_state"
    | "not_found"
    | "forbidden"
    | "db_error";
};

// UCP 600 MT700 field 46A — baseline required documents for bulk trade.
// Category-specific extras (Kimberley, OECD 3TG, CITES, GACC, phytosanitary)
// are appended by the action based on the resource category.
const BASE_REQUIRED_DOCS = [
  "commercial_invoice",
  "packing_list",
  "bill_of_lading",
  "certificate_of_origin",
  "inspection_certificate",
  "insurance_policy",
];

function lcReference() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `LC-R-${y}${m}-${suffix}`;
}

function mapPaymentToLcType(instrument: string | null | undefined):
  | "sight"
  | "usance_30"
  | "usance_60"
  | "usance_90"
  | "usance_120"
  | "usance_180" {
  if (!instrument) return "sight";
  if (instrument === "lc_at_sight") return "sight";
  if (instrument === "lc_usance") return "usance_60";
  return "sight";
}

// State machine: allowed forward transitions. The `cancelled` state is
// reachable from any non-terminal state; `expired` only from active states.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["applied", "cancelled"],
  applied: ["issued", "cancelled"],
  issued: ["advised", "cancelled"],
  advised: ["confirmed", "docs_presented", "expired", "cancelled"],
  confirmed: ["docs_presented", "expired", "cancelled"],
  docs_presented: ["discrepancies", "accepted", "cancelled"],
  discrepancies: ["accepted", "cancelled"],
  accepted: ["settled", "cancelled"],
  settled: [],
  expired: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export async function acceptQuoteAndDraftLc(
  quotationId: string
): Promise<ActionResult<{ lc_id: string; lc_reference: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }

  const supabase = await createClient();

  // Load quote + RFQ + category for compliance doc additions
  const { data: quote, error: quoteErr } = await supabase
    .from("quotations")
    .select(
      `id, rfq_id, supplier_id, unit_price_usd, quantity_numeric,
       unit_of_measure, port_of_loading, port_of_discharge,
       payment_instrument, status, total_amount, currency,
       rfqs:rfq_id (
         id, buyer_company_id, shipment_window_end,
         resource_category_id,
         resource_categories:resource_category_id (
           slug, requires_kimberley, requires_oecd_3tg,
           requires_cites, requires_gacc, requires_phytosanitary, requires_assay
         )
       )`
    )
    .eq("id", quotationId)
    .maybeSingle();

  if (quoteErr || !quote) {
    return { success: false, error: "Quotation not found", code: "not_found" };
  }
  if (!["submitted", "revised"].includes(quote.status as string)) {
    return {
      success: false,
      error: "Quotation is not in an acceptable state",
      code: "invalid_state",
    };
  }

  const rfq = quote.rfqs as unknown as {
    id: string;
    buyer_company_id: string | null;
    shipment_window_end: string | null;
    resource_category_id: string | null;
    resource_categories: {
      slug: string;
      requires_kimberley: boolean;
      requires_oecd_3tg: boolean;
      requires_cites: boolean;
      requires_gacc: boolean;
      requires_phytosanitary: boolean;
      requires_assay: boolean;
    } | null;
  } | null;

  if (!rfq?.buyer_company_id) {
    return {
      success: false,
      error: "RFQ missing buyer company",
      code: "invalid_state",
    };
  }

  if (!tier.paidCompanyIds.includes(rfq.buyer_company_id)) {
    return {
      success: false,
      error: "Accepting quotes is a paid-tier feature for the buyer company.",
      code: "paid_tier_required",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthorized" };
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) {
    return { success: false, error: "Profile missing", code: "unauthorized" };
  }

  // Compose required-documents list with compliance gates.
  const required = new Set<string>(BASE_REQUIRED_DOCS);
  const cat = rfq.resource_categories;
  if (cat?.requires_assay) required.add("assay_report");
  if (cat?.requires_kimberley) required.add("kimberley_process_certificate");
  if (cat?.requires_oecd_3tg) required.add("oecd_3tg_due_diligence_report");
  if (cat?.requires_cites) required.add("cites_permit");
  if (cat?.requires_gacc) required.add("gacc_registration_certificate");
  if (cat?.requires_phytosanitary) required.add("phytosanitary_certificate");

  const amountUsd = Number(
    ((quote.total_amount as number) / 100).toFixed(2)
  );

  // Transaction-ish: accept the quote, award the RFQ, draft the LC.
  const { error: acceptErr } = await supabase
    .from("quotations")
    .update({ status: "accepted" })
    .eq("id", quotationId);
  if (acceptErr) return { success: false, error: acceptErr.message, code: "db_error" };

  const { error: awardErr } = await supabase
    .from("rfqs")
    .update({
      status: "awarded",
      awarded_quotation_id: quotationId,
      awarded_at: new Date().toISOString(),
    })
    .eq("id", rfq.id);
  if (awardErr) return { success: false, error: awardErr.message, code: "db_error" };

  const reference = lcReference();
  const { data: lc, error: lcErr } = await supabase
    .from("letters_of_credit")
    .insert({
      lc_reference: reference,
      rfq_id: rfq.id,
      quotation_id: quote.id,
      applicant_company_id: rfq.buyer_company_id,
      beneficiary_company_id: quote.supplier_id,
      lc_type: mapPaymentToLcType(quote.payment_instrument as string | null),
      amount_usd: amountUsd,
      currency: (quote.currency as string) ?? "USD",
      latest_shipment_date: rfq.shipment_window_end ?? null,
      documents_required: Array.from(required),
      status: "draft",
      created_by: profile.id,
    })
    .select("id, lc_reference")
    .single();

  if (lcErr) {
    if (lcErr.message.toLowerCase().includes("policy")) {
      return {
        success: false,
        error:
          "Buyer company must be on a paid tier to draft a letter of credit.",
        code: "paid_tier_required",
      };
    }
    return { success: false, error: lcErr.message, code: "db_error" };
  }

  return {
    success: true,
    data: { lc_id: lc.id as string, lc_reference: lc.lc_reference as string },
  };
}

export interface UpdateLcInput {
  lcId: string;
  bankLcNumber?: string;
  issuingBankName?: string;
  issuingBankSwift?: string;
  advisingBankName?: string;
  advisingBankSwift?: string;
  confirmingBankName?: string;
  confirmingBankSwift?: string;
  lcType?:
    | "sight"
    | "usance_30"
    | "usance_60"
    | "usance_90"
    | "usance_120"
    | "usance_180";
  amountUsd?: number;
  tolerancePct?: number;
  issueDate?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  presentationDays?: number;
  documentsRequired?: string[];
}

export async function updateLc(
  input: UpdateLcInput
): Promise<ActionResult<{ id: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }

  const supabase = await createClient();
  const { data: lc, error: lcErr } = await supabase
    .from("letters_of_credit")
    .select("id, status, applicant_company_id")
    .eq("id", input.lcId)
    .maybeSingle();
  if (lcErr || !lc) {
    return { success: false, error: "LC not found", code: "not_found" };
  }
  if (!tier.companyIds.includes(lc.applicant_company_id)) {
    return { success: false, error: "Only the applicant can edit this LC", code: "forbidden" };
  }
  if (lc.status !== "draft" && lc.status !== "applied") {
    return {
      success: false,
      error: `LC terms are locked once the LC is ${lc.status}`,
      code: "invalid_state",
    };
  }

  const patch: Record<string, unknown> = {};
  if (input.bankLcNumber !== undefined) patch.bank_lc_number = input.bankLcNumber;
  if (input.issuingBankName !== undefined) patch.issuing_bank_name = input.issuingBankName;
  if (input.issuingBankSwift !== undefined) patch.issuing_bank_swift = input.issuingBankSwift;
  if (input.advisingBankName !== undefined) patch.advising_bank_name = input.advisingBankName;
  if (input.advisingBankSwift !== undefined) patch.advising_bank_swift = input.advisingBankSwift;
  if (input.confirmingBankName !== undefined)
    patch.confirming_bank_name = input.confirmingBankName;
  if (input.confirmingBankSwift !== undefined)
    patch.confirming_bank_swift = input.confirmingBankSwift;
  if (input.lcType !== undefined) patch.lc_type = input.lcType;
  if (input.amountUsd !== undefined) patch.amount_usd = input.amountUsd;
  if (input.tolerancePct !== undefined) patch.tolerance_pct = input.tolerancePct;
  if (input.issueDate !== undefined) patch.issue_date = input.issueDate;
  if (input.expiryDate !== undefined) patch.expiry_date = input.expiryDate;
  if (input.latestShipmentDate !== undefined)
    patch.latest_shipment_date = input.latestShipmentDate;
  if (input.presentationDays !== undefined)
    patch.presentation_days = input.presentationDays;
  if (input.documentsRequired !== undefined)
    patch.documents_required = input.documentsRequired;

  const { error } = await supabase
    .from("letters_of_credit")
    .update(patch)
    .eq("id", input.lcId);

  if (error) return { success: false, error: error.message, code: "db_error" };
  return { success: true, data: { id: input.lcId } };
}

export async function transitionLcStatus(
  lcId: string,
  toStatus:
    | "applied"
    | "issued"
    | "advised"
    | "confirmed"
    | "docs_presented"
    | "discrepancies"
    | "accepted"
    | "settled"
    | "expired"
    | "cancelled",
  _note?: string
): Promise<ActionResult<{ id: string; status: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }

  const supabase = await createClient();
  const { data: lc, error: lcErr } = await supabase
    .from("letters_of_credit")
    .select(
      "id, status, applicant_company_id, beneficiary_company_id, amount_usd"
    )
    .eq("id", lcId)
    .maybeSingle();
  if (lcErr || !lc) {
    return { success: false, error: "LC not found", code: "not_found" };
  }

  // Authorization: buyer drives most states; supplier drives docs_presented.
  const isApplicant = tier.companyIds.includes(lc.applicant_company_id);
  const isBeneficiary = tier.companyIds.includes(lc.beneficiary_company_id);
  if (!isApplicant && !isBeneficiary) {
    return { success: false, error: "Not a counterparty on this LC", code: "forbidden" };
  }

  const beneficiaryAllowed: string[] = ["docs_presented"];
  const mustBeApplicant = !beneficiaryAllowed.includes(toStatus);
  if (mustBeApplicant && !isApplicant) {
    return {
      success: false,
      error: "Only the buyer (applicant) can perform this transition",
      code: "forbidden",
    };
  }

  if (!canTransition(lc.status as string, toStatus)) {
    return {
      success: false,
      error: `Cannot transition LC from ${lc.status} to ${toStatus}`,
      code: "invalid_state",
    };
  }

  const patch: Record<string, unknown> = { status: toStatus };
  if (toStatus === "settled") {
    patch.settled_at = new Date().toISOString();
    patch.settled_amount_usd = lc.amount_usd;
  }

  const { error } = await supabase
    .from("letters_of_credit")
    .update(patch)
    .eq("id", lcId);

  if (error) return { success: false, error: error.message, code: "db_error" };
  return { success: true, data: { id: lcId, status: toStatus } };
}

export async function recordLcDocument(
  lcId: string,
  documentType: string,
  fileUrl: string,
  fileName?: string
): Promise<ActionResult<{ id: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthorized" };
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) {
    return { success: false, error: "Profile missing", code: "unauthorized" };
  }

  const { data, error } = await supabase
    .from("lc_documents")
    .insert({
      lc_id: lcId,
      document_type: documentType,
      file_url: fileUrl,
      file_name: fileName ?? null,
      presented_by: profile.id,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message, code: "db_error" };
  return { success: true, data };
}
