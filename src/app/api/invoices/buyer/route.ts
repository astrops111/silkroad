// POST /api/invoices/buyer
//
// Issues a buyer-facing AR invoice for a completed supplier order.
// Routes to the country-appropriate provider (Kenya ETIMS, Uganda EFRIS,
// generic PDF, etc.) via issueARInvoice() → issueInvoice().
//
// Body: { supplierOrderId, shipmentId?, invoiceType?, notes?, paymentTerms? }
// Response: { success, invoiceId, invoiceNumber, externalReference?, error? }
//
// GET /api/invoices/buyer?companyId=&page=&limit=
// Lists issued invoices for a buyer company.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { issueARInvoice } from "@/lib/invoice/ar-issuer";
import { z } from "zod";

const ADMIN_ROLES = ["admin_super", "admin_moderator"] as const;

const PostBodySchema = z.object({
  supplierOrderId: z.string().uuid(),
  shipmentId: z.string().uuid().optional(),
  invoiceType: z
    .enum(["b2b_standard", "proforma", "commission", "credit_note"])
    .optional(),
  notes: z.string().max(500).optional(),
  paymentTerms: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body", detail: String(err) }, { status: 400 });
  }

  const result = await issueARInvoice({
    supplierOrderId: body.supplierOrderId,
    shipmentId: body.shipmentId,
    invoiceType: body.invoiceType,
    notes: body.notes,
    paymentTerms: body.paymentTerms,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const role = user.company_members?.[0]?.role;
  const isAdmin = role && (ADMIN_ROLES as readonly string[]).includes(role);
  const userCompanyId = user.company_members?.[0]?.company_id;

  if (!isAdmin && userCompanyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("b2b_invoices")
    .select(
      "id, invoice_number, invoice_type, status, total_amount, currency, issued_at, country_code, html_storage_path",
      { count: "exact" },
    )
    .eq("recipient_company_id", companyId)
    .order("issued_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [], total: count ?? 0, page, limit });
}
