import type { CostBreakdown } from "@/lib/logistics/landed-cost";
import type { OpsFreightQuoteRow } from "@/lib/queries/ops-freight-quotes";

export function readCostBreakdown(row: OpsFreightQuoteRow): CostBreakdown | null {
  if (!row.cost_components) return null;
  return row.cost_components as unknown as CostBreakdown;
}
