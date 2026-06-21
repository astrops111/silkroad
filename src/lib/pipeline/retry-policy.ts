import type { PipelineEventType } from "./types";

type BackoffStrategy = "exponential" | "linear" | "fixed";

interface RetryPolicy {
  maxAttempts: number;
  backoff: BackoffStrategy;
  baseDelayMs: number;
  maxDelayMs?: number;
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

// Per-event-type retry policies.
// Stage 1: fast retry — internal services only.
// Stage 2-4: slower — external carrier/customs APIs.
// Alerts: few attempts, die fast so admin notices.
const POLICIES: Partial<Record<PipelineEventType, RetryPolicy>> = {
  "order.payment_confirmed":         { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 10_000  },
  "order.supplier_notified":         { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 10_000  },
  "order.supplier_shipped":          { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 15_000  },

  "shipment.created":                { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 30_000  },
  "shipment.freight_booked":         { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 60_000  },
  "shipment.export_customs_filed":   { maxAttempts: 8,  backoff: "linear",      baseDelayMs: 300_000 },
  "shipment.export_cleared":         { maxAttempts: 8,  backoff: "linear",      baseDelayMs: 300_000 },
  "shipment.origin_departed":        { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 60_000  },
  "shipment.arrived_destination":    { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 60_000  },

  "customs.arrival_notice_received": { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 60_000  },
  "customs.entry_filed":             { maxAttempts: 10, backoff: "linear",      baseDelayMs: 300_000 },
  "customs.duties_assessed":         { maxAttempts: 8,  backoff: "linear",      baseDelayMs: 300_000 },
  "customs.duties_paid":             { maxAttempts: 8,  backoff: "exponential", baseDelayMs: 60_000  },
  "customs.cleared":                 { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 30_000  },
  "customs.hold_opened":             { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 60_000  },
  "customs.hold_resolved":           { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 60_000  },

  "delivery.scheduled":              { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 15_000  },
  "delivery.picked_up":              { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 15_000  },
  "delivery.completed":              { maxAttempts: 5,  backoff: "exponential", baseDelayMs: 15_000  },

  "dispute_window.opened":           { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 60_000  },
  "dispute_window.closed":           { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 60_000  },

  "shipment.stalled":                { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 300_000 },
  "customs.demurrage_warning":       { maxAttempts: 3,  backoff: "fixed",       baseDelayMs: 300_000 },

  "settlement.triggered":            { maxAttempts: 8,  backoff: "exponential", baseDelayMs: 30_000  },
};

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 5,
  backoff: "exponential",
  baseDelayMs: 30_000,
};

export function getPolicy(eventType: PipelineEventType): RetryPolicy {
  return POLICIES[eventType] ?? DEFAULT_POLICY;
}

/**
 * Returns the Date for the next retry, or null if max attempts exhausted
 * (caller should move event to 'dead').
 */
export function computeNextRetry(
  eventType: PipelineEventType,
  attemptCount: number
): Date | null {
  const policy = getPolicy(eventType);
  if (attemptCount >= policy.maxAttempts) return null;

  let delayMs: number;
  switch (policy.backoff) {
    case "exponential":
      delayMs = policy.baseDelayMs * Math.pow(2, attemptCount);
      break;
    case "linear":
      delayMs = policy.baseDelayMs * (attemptCount + 1);
      break;
    default:
      delayMs = policy.baseDelayMs;
  }

  return new Date(Date.now() + Math.min(delayMs, policy.maxDelayMs ?? FOUR_HOURS));
}

export function maxAttemptsFor(eventType: PipelineEventType): number {
  return getPolicy(eventType).maxAttempts;
}
