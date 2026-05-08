// GET /api/shipments/:id/documents?kind=commercial_invoice|packing_list
//
// Returns a self-contained, print-ready HTML document for the shipment.
// The browser's print dialog (Ctrl+P → Save as PDF) is the delivery
// mechanism; no server-side PDF library is required.
//
// Reachable only behind the /admin layout auth guard.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { buildShipmentDocContext } from "@/lib/logistics/documents/context-builder";
import {
  generateCommercialInvoice,
  generatePackingList,
} from "@/lib/logistics/documents/generate";

const ALLOWED_KINDS = ["commercial_invoice", "packing_list"] as const;
type DocKind = (typeof ALLOWED_KINDS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id: shipmentId } = await params;
  const { searchParams } = request.nextUrl;
  const kind = (searchParams.get("kind") ?? "commercial_invoice") as DocKind;

  if (!ALLOWED_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `Invalid kind. Must be one of: ${ALLOWED_KINDS.join(", ")}` },
      { status: 400 },
    );
  }

  const ctx = await buildShipmentDocContext(shipmentId);
  if (!ctx) {
    return NextResponse.json(
      { error: "Shipment not found or insufficient data to generate document" },
      { status: 404 },
    );
  }

  const doc =
    kind === "packing_list"
      ? generatePackingList(ctx)
      : generateCommercialInvoice(ctx);

  return new NextResponse(doc.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // inline so browser renders it (user prints to PDF via Ctrl+P)
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      // Brief private cache — repeat opens in same admin session skip the DB round-trip.
      "Cache-Control": "private, max-age=60",
    },
  });
}
