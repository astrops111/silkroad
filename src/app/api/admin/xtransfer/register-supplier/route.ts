import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { registerXTransferPayee } from "@/lib/payments/gateways/xtransfer";

/**
 * POST /api/admin/xtransfer/register-supplier
 *
 * Registers a supplier as an XTransfer beneficiary (payee) and stores
 * the returned payee ID in supplier_profiles.xtransfer_payee_id.
 *
 * This is an ops-only route — call it once per CN/SEA supplier before
 * their first payout. After registration, processSettlement() will
 * automatically route their payouts through XTransfer.
 *
 * Body:
 *   {
 *     supplierId:         string  — companies.id (UUID)
 *     bankCountry:        string  — ISO 3166-1 alpha-2 (e.g. "CN")
 *     bankAccountNumber:  string
 *     bankName:           string
 *     swiftCode?:         string
 *     routingNumber?:     string
 *     payoutCurrency?:    string  — defaults to "CNY"
 *   }
 */

const schema = z.object({
  supplierId:        z.string().uuid(),
  bankCountry:       z.string().length(2),
  bankAccountNumber: z.string().min(1),
  bankName:          z.string().min(1),
  swiftCode:         z.string().optional(),
  routingNumber:     z.string().optional(),
  payoutCurrency:    z.string().length(3).default("CNY"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // H20: Use standard requireAdmin() to align with all other admin routes
  const authResult = await requireAdmin();
  if (isAuthError(authResult)) return authResult;

  const supabase = await createClient();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const {
    supplierId,
    bankCountry,
    bankAccountNumber,
    bankName,
    swiftCode,
    routingNumber,
    payoutCurrency,
  } = parsed.data;

  // Verify supplier exists
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", supplierId)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  // Idempotency: if already registered, return existing record
  const { data: existingProfile } = await supabase
    .from("supplier_profiles")
    .select("xtransfer_payee_id, xtransfer_payee_status")
    .eq("company_id", supplierId)
    .single();

  if (existingProfile?.xtransfer_payee_id) {
    return NextResponse.json({
      message: "Supplier already registered with XTransfer",
      payeeId: existingProfile.xtransfer_payee_id,
      status: existingProfile.xtransfer_payee_status,
    });
  }

  // Register with XTransfer
  let payeeResult: Awaited<ReturnType<typeof registerXTransferPayee>>;
  try {
    payeeResult = await registerXTransferPayee({
      companyName: company.name,
      bankCountry,
      bankAccountNumber,
      bankName,
      swiftCode,
      routingNumber,
      currency: payoutCurrency,
      externalId: supplierId, // stable platform ID for XTransfer idempotency
    });
  } catch (err) {
    console.error("[admin/xtransfer/register-supplier] XTransfer API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "XTransfer registration failed" },
      { status: 502 }
    );
  }

  // Save payee ID and status
  const { error: updateError } = await supabase
    .from("supplier_profiles")
    .update({
      xtransfer_payee_id: payeeResult.payeeId,
      xtransfer_payee_status: payeeResult.status,
      xtransfer_payout_currency: payoutCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", supplierId);

  if (updateError) {
    // XTransfer registration succeeded but DB save failed — log the payee ID so it can be
    // recovered manually without re-registering
    console.error(
      "[admin/xtransfer/register-supplier] DB save failed — payeeId to recover manually:",
      payeeResult.payeeId,
      updateError
    );
    return NextResponse.json(
      {
        error: "Registered with XTransfer but DB save failed",
        payeeId: payeeResult.payeeId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    supplierId,
    payeeId: payeeResult.payeeId,
    status: payeeResult.status,
    payoutCurrency,
    message:
      payeeResult.status === "active"
        ? "Supplier active on XTransfer — next settlement will be paid automatically"
        : "Supplier registered — awaiting XTransfer review before payouts are enabled",
  });
}
