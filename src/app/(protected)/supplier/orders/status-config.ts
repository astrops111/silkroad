import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Factory, ShieldCheck, Package, Send, Truck } from "lucide-react";

// Mirrors the real b2b_order_status Postgres enum (database.types.ts). Only
// the statuses a supplier can actively move an order through are actionable
// here — earlier (pending_payment, deposit_paid) and later (delivered
// onward) transitions happen elsewhere (payment, buyer/logistics).
export const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: LucideIcon }> = {
  paid: { next: "confirmed", label: "Confirm Order", icon: CheckCircle2 },
  confirmed: { next: "in_production", label: "Start Production", icon: Factory },
  in_production: { next: "quality_check", label: "Quality Check", icon: ShieldCheck },
  quality_check: { next: "ready_to_ship", label: "Ready to Ship", icon: Package },
  ready_to_ship: { next: "dispatched", label: "Mark Dispatched", icon: Send },
  dispatched: { next: "in_transit", label: "Mark In Transit", icon: Truck },
};

export const STATUS_TIMELINE: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "paid", label: "Payment Received", icon: CheckCircle2 },
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "in_production", label: "In Production", icon: Factory },
  { key: "quality_check", label: "Quality Check", icon: ShieldCheck },
  { key: "ready_to_ship", label: "Ready to Ship", icon: Package },
  { key: "dispatched", label: "Dispatched", icon: Send },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  pending_payment: "Pending Payment",
  deposit_paid: "Deposit Paid",
  paid: "Paid",
  confirmed: "Confirmed",
  in_production: "In Production",
  quality_check: "Quality Check",
  ready_to_ship: "Ready to Ship",
  assigned_to_logistics: "Assigned to Logistics",
  dispatched: "Dispatched",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  refund_requested: "Refund Requested",
  refunded: "Refunded",
};
