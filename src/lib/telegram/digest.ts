import { createServiceClient } from "@/lib/supabase/server";
import { tgEsc } from "./notify";

/**
 * Builds an HTML-formatted summary of error_logs rows from the last N hours,
 * for the Telegram bot's /digest command. Never throws — callers should
 * still guard, but an empty/error result degrades to a plain "no data" line.
 */
export async function buildErrorDigest(hours: number): Promise<string> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("error_logs")
    .select("severity, error_code, source, message, resolved, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const windowLabel = hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;

  if (error) {
    return `📊 <b>Error digest — last ${windowLabel}</b>\n\nCouldn't read error_logs: ${tgEsc(error.message)}`;
  }

  const entries = data ?? [];
  if (!entries.length) {
    return `📊 <b>Error digest — last ${windowLabel}</b>\n\nNo errors logged. All clear.`;
  }

  const bySeverity: Record<string, number> = { critical: 0, error: 0, warning: 0 };
  let unresolvedCount = 0;
  for (const e of entries) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    if (!e.resolved) unresolvedCount++;
  }

  const topUnresolved = entries.filter((e) => !e.resolved && e.severity !== "warning").slice(0, 8);

  const lines = [
    `📊 <b>Error digest — last ${windowLabel}</b>`,
    ``,
    `Total: ${entries.length} · Unresolved: ${unresolvedCount}`,
    `🔥 Critical: ${bySeverity.critical} · 🟠 Error: ${bySeverity.error} · 🟡 Warning: ${bySeverity.warning}`,
  ];

  if (topUnresolved.length) {
    lines.push(``, `<b>Unresolved (most recent ${topUnresolved.length}):</b>`);
    for (const e of topUnresolved) {
      const icon = e.severity === "critical" ? "🔥" : "🟠";
      lines.push(`${icon} ${tgEsc(e.error_code)} — ${tgEsc(e.source)}: ${tgEsc(e.message.slice(0, 100))}`);
    }
  }

  return lines.join("\n");
}
