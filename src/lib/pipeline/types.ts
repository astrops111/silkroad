import type { SupabaseClient } from "@supabase/supabase-js";

// ── Event types (mirror the DB enum) ──────────────────────────────────────────

export type PipelineEventType =
  // Stage 1: Supplier order
  | "order.payment_confirmed"
  | "order.supplier_notified"
  | "order.supplier_shipped"
  // Stage 2: Origin logistics
  | "shipment.created"
  | "shipment.freight_booked"
  | "shipment.export_customs_filed"
  | "shipment.export_cleared"
  | "shipment.origin_departed"
  | "shipment.arrived_destination"
  // Stage 3-4: Import customs
  | "customs.arrival_notice_received"
  | "customs.entry_filed"
  | "customs.duties_assessed"
  | "customs.duties_paid"
  | "customs.cleared"
  | "customs.hold_opened"
  | "customs.hold_resolved"
  // Stage 5: Last-mile
  | "delivery.scheduled"
  | "delivery.picked_up"
  | "delivery.completed"
  | "dispute_window.opened"
  | "dispute_window.closed"
  // Cross-cutting
  | "shipment.stalled"
  | "customs.demurrage_warning"
  | "settlement.triggered";

export type PipelineEventStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead"
  | "cancelled";

// ── Event as returned from the DB ─────────────────────────────────────────────

export interface PipelineEvent {
  id: string;
  event_type: PipelineEventType;
  status: PipelineEventStatus;
  purchase_order_id: string | null;
  supplier_order_id: string | null;
  shipment_id: string | null;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  locked_until: string | null;
  result: Record<string, unknown> | null;
  last_error: string | null;
  error_history: Array<{ attempt: number; error: string; at: string }>;
  idempotency_key: string | null;
  triggered_by_type: PipelineEventType | null;
  triggered_by_id: string | null;
  created_by: string | null;
  created_at: string;
  processed_at: string | null;
}

// ── What a handler returns ────────────────────────────────────────────────────

export interface EnqueueRequest {
  eventType: PipelineEventType;
  purchaseOrderId?: string;
  supplierOrderId?: string;
  shipmentId?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  /** ISO timestamp — schedule this event to process in the future */
  nextRetryAt?: string;
  maxAttempts?: number;
}

export interface HandlerResult {
  success: boolean;
  /** Stored in pipeline_events.result on success */
  result?: Record<string, unknown>;
  /** Child events to enqueue after this handler succeeds */
  nextEvents?: EnqueueRequest[];
  /** Error message stored in last_error on failure */
  error?: string;
}

// ── Handler function signature ────────────────────────────────────────────────

export type EventHandler = (
  event: PipelineEvent,
  supabase: SupabaseClient
) => Promise<HandlerResult>;
