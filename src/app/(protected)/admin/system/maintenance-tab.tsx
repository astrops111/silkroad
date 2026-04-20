"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Shield,
  Webhook,
  Brain,
  Mail,
  Gauge,
  KeyRound,
  CalendarClock,
  ShieldAlert,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Truck,
  ArrowUpDown,
  Receipt,
  Database,
} from "lucide-react";
import { getMaintenanceOverview } from "@/lib/logging/maintenance-stats";

type MaintenanceData = Awaited<ReturnType<typeof getMaintenanceOverview>>;

export function MaintenanceTab() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMaintenanceOverview();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: "var(--amber)", opacity: 0.5 }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>Loading maintenance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Infrastructure Health
        </h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 8%, transparent)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ---- CRITICAL: Webhooks, Email, AI ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Webhook}
          label="Webhooks (7d)"
          value={String(data.webhooks.totalWeek)}
          sub={`${data.webhooks.successRate}% delivery rate`}
          color={Number(data.webhooks.failedWeek) > 0 ? "var(--danger)" : "var(--success)"}
          alert={Number(data.webhooks.failedWeek) > 0 ? `${data.webhooks.failedWeek} failed` : undefined}
        />
        <MetricCard
          icon={Mail}
          label="Emails (7d)"
          value={String(data.email.totalWeek)}
          sub={`${data.email.deliveryRate}% delivered`}
          color={Number(data.email.bouncedWeek) > 0 ? "var(--warning)" : "var(--success)"}
          alert={Number(data.email.bouncedWeek) > 0 ? `${data.email.bouncedWeek} bounced` : undefined}
        />
        <MetricCard
          icon={Brain}
          label="AI Requests (month)"
          value={String(data.aiUsage.monthRequests)}
          sub={`$${data.aiUsage.monthCost} est. cost`}
          color="var(--indigo)"
          alert={data.aiUsage.weekErrors > 0 ? `${data.aiUsage.weekErrors} errors this week` : undefined}
        />
        <MetricCard
          icon={Gauge}
          label="AI Tokens (month)"
          value={data.aiUsage.monthTokens.toLocaleString()}
          sub={`${data.aiUsage.weekTokens.toLocaleString()} this week`}
          color="var(--indigo)"
        />
      </div>

      {/* ---- Gateway Health ---- */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Payment Gateways
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.gateways.gatewayMetrics.length === 0 ? (
            <div className="col-span-full p-6 rounded-xl border text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <Gauge className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No gateway transactions recorded yet</p>
            </div>
          ) : (
            data.gateways.gatewayMetrics.map((gw) => (
              <div key={gw.gateway} className="p-4 rounded-xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" style={{ color: "var(--amber)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {gw.gateway.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  {data.gateways.latestHealth[gw.gateway] && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: data.gateways.latestHealth[gw.gateway].isAvailable ? "var(--success)" : "var(--danger)" }}
                      title={data.gateways.latestHealth[gw.gateway].isAvailable ? "Available" : "Down"}
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{gw.total}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--success)" }}>{gw.successRate}%</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Success</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{gw.avgResponseMs}ms</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Avg Time</p>
                  </div>
                </div>
                {gw.failed > 0 && (
                  <div className="mt-2 text-[11px] font-medium px-2 py-1 rounded" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
                    {gw.failed} failed transactions this week
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---- Security & Sessions ---- */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Security & Sessions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard icon={KeyRound} label="Active Sessions" value={String(data.sessions.activeSessions)} color="var(--indigo)" />
          <MetricCard icon={KeyRound} label="Logins Today" value={String(data.sessions.loginsToday)} sub={`${data.sessions.loginsWeek} this week`} color="var(--success)" />
          <MetricCard
            icon={ShieldAlert}
            label="Failed Logins (7d)"
            value={String(data.sessions.failedLoginsWeek)}
            color={data.sessions.failedLoginsWeek > 10 ? "var(--danger)" : "var(--warning)"}
          />
          <MetricCard
            icon={ShieldAlert}
            label="Suspicious Sessions"
            value={String(data.sessions.suspiciousSessionsWeek)}
            color={data.sessions.suspiciousSessionsWeek > 0 ? "var(--danger)" : "var(--success)"}
          />
          <MetricCard
            icon={ArrowUpDown}
            label="Rate Limit Breaches"
            value={String(data.rateLimitBreaches.breachesWeek)}
            sub="this week"
            color={data.rateLimitBreaches.breachesWeek > 0 ? "var(--warning)" : "var(--success)"}
          />
        </div>
      </div>

      {/* ---- Operations ---- */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={CalendarClock}
            label="Jobs Running"
            value={String(data.jobs.runningNow)}
            sub={`${data.jobs.successToday} completed today`}
            color={data.jobs.failedToday > 0 ? "var(--danger)" : "var(--success)"}
            alert={data.jobs.failedToday > 0 ? `${data.jobs.failedToday} failed today` : undefined}
          />
          <MetricCard
            icon={Receipt}
            label="Pending Refunds"
            value={String(data.refunds.pendingRefunds)}
            sub={`${data.refunds.completedWeek} completed this week`}
            color={data.refunds.pendingRefunds > 0 ? "var(--warning)" : "var(--success)"}
            alert={data.refunds.failedWeek > 0 ? `${data.refunds.failedWeek} failed` : undefined}
          />
          <MetricCard
            icon={Truck}
            label="Shipment Exceptions"
            value={String(data.shipmentExceptions.openExceptions)}
            sub={`${data.shipmentExceptions.slaBreachesWeek} SLA breaches`}
            color={data.shipmentExceptions.openExceptions > 0 ? "var(--warning)" : "var(--success)"}
          />
          <MetricCard
            icon={HardDrive}
            label="File Storage"
            value={data.storageStats.totalSizeFormatted}
            sub={`${data.storageStats.totalFiles.toLocaleString()} files`}
            color="var(--indigo)"
          />
        </div>
      </div>

      {/* ---- Subscriptions & Compliance ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <div className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Subscriptions (30d)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat label="Upgrades" value={data.subscriptionEvents.upgradesMonth} color="var(--success)" icon={TrendingUp} />
            <MiniStat label="Downgrades" value={data.subscriptionEvents.downgradesMonth} color="var(--warning)" icon={TrendingDown} />
            <MiniStat label="Cancellations" value={data.subscriptionEvents.cancellationsMonth} color="var(--danger)" icon={XCircle} />
            <MiniStat label="Payment Failures" value={data.subscriptionEvents.paymentFailuresMonth} color="var(--danger)" icon={CreditCard} />
          </div>
        </div>

        {/* Compliance */}
        <div className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Compliance & Audit
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat label="Admin Actions (7d)" value={data.adminAudit.actionsThisWeek} color="var(--indigo)" icon={Shield} />
            <MiniStat label="Pending Approvals" value={data.adminAudit.pendingApproval} color={data.adminAudit.pendingApproval > 0 ? "var(--warning)" : "var(--success)"} icon={ShieldAlert} />
            <MiniStat label="Deletion Requests" value={data.deletionRequests.pendingRequests} color={data.deletionRequests.pendingRequests > 0 ? "var(--warning)" : "var(--success)"} icon={Database} />
            <MiniStat
              label="Overdue Deletions"
              value={data.deletionRequests.overdueRequests}
              color={data.deletionRequests.overdueRequests > 0 ? "var(--danger)" : "var(--success)"}
              icon={AlertTriangle}
            />
          </div>
        </div>
      </div>

      {/* AI Feature Breakdown */}
      {data.aiUsage.featureBreakdown.length > 0 && (
        <div className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            AI Feature Usage (this month)
          </h2>
          <div className="space-y-2.5">
            {data.aiUsage.featureBreakdown.map((f) => {
              const total = data.aiUsage.monthRequests || 1;
              const pct = (f.count / total) * 100;
              return (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-40 truncate" style={{ color: "var(--text-secondary)" }}>
                    {f.feature.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                    <div
                      className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 3)}%`, background: "color-mix(in srgb, var(--indigo) 15%, transparent)" }}
                    >
                      <span className="text-[11px] font-semibold" style={{ color: "var(--indigo)" }}>{f.count}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: "var(--text-tertiary)" }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Sub-components -- */

function MetricCard({ icon: Icon, label, value, sub, color, alert }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  alert?: string;
}) {
  return (
    <div className="p-4 rounded-xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{sub}</p>}
      {alert && (
        <p className="text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full w-fit" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
          {alert}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value, color, icon: Icon }: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{value}</p>
        <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      </div>
    </div>
  );
}
