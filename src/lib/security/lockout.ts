"use server";

import { createServiceClient } from "@/lib/supabase/server";

export const MAX_FAILED_ATTEMPTS = 4;
export const LOCKOUT_WINDOW_MINUTES = 15;
const LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_MINUTES * 60 * 1000;
const LOOKBACK_ROWS = 10;

export type LockoutState =
  | { locked: false; failuresSinceSuccess: number }
  | { locked: true; retryAfterSeconds: number; failuresSinceSuccess: number };

export async function getLockoutState(email: string): Promise<LockoutState> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("login_attempts")
    .select("status, attempted_at")
    .eq("email", email)
    .order("attempted_at", { ascending: false })
    .limit(LOOKBACK_ROWS);

  if (!data || data.length === 0) {
    return { locked: false, failuresSinceSuccess: 0 };
  }

  const failureTimes: number[] = [];
  for (const row of data) {
    if (row.status === "success") break;
    if ((row.status === "failed" || row.status === "blocked") && row.attempted_at) {
      failureTimes.push(new Date(row.attempted_at).getTime());
    }
  }

  if (failureTimes.length >= MAX_FAILED_ATTEMPTS) {
    const mostRecent = failureTimes[0];
    const unlockAt = mostRecent + LOCKOUT_WINDOW_MS;
    const now = Date.now();
    if (unlockAt > now) {
      return {
        locked: true,
        retryAfterSeconds: Math.ceil((unlockAt - now) / 1000),
        failuresSinceSuccess: failureTimes.length,
      };
    }
  }

  return { locked: false, failuresSinceSuccess: failureTimes.length };
}
