import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Lock,
  Percent,
  Shield,
  Ship,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getExpiringLanes,
  getExpiringOpsQuotes,
  getLogisticsKpis,
  getReferenceSummary,
} from "@/lib/queries/logistics-dashboard";

export const dynamic = "force-dynamic";

export default async function LogisticsDashboardPage() {
  const [kpis, expiringQuotes, expiringLanes, reference] = await Promise.all([
    getLogisticsKpis(),
    getExpiringOpsQuotes(7),
    getExpiringLanes(14),
    getReferenceSummary(),
  ]);

  const fmtMoney = (minor: number, ccy = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, currencyDisplay: "code", maximumFractionDigits: 0 })
      .format(minor / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Logistics
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Quote pipeline, lane & tariff health, and operational state.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/logistics/customs"><Lock className="mr-1 size-4" /> Customs queue</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/logistics/reference"><SlidersHorizontal className="mr-1 size-4" /> Reference data</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/logistics/quotes/new">New freight quote</Link>
          </Button>
        </div>
      </div>

      {kpis.pendingScreening > 0 && (
        <Link
          href="/admin/logistics/screening"
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <Shield className="size-4 text-amber-700" />
          <span className="flex-1">
            <span className="font-semibold">{kpis.pendingScreening}</span>{" "}
            quote{kpis.pendingScreening === 1 ? "" : "s"} held for compliance review.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {kpis.openCustomsHolds > 0 && (
        <Link
          href="/admin/logistics/customs?status=on_hold"
          className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 hover:bg-red-100"
        >
          <Lock className="size-4 text-red-700" />
          <span className="flex-1">
            <span className="font-semibold">{kpis.openCustomsHolds}</span>{" "}
            customs hold{kpis.openCustomsHolds === 1 ? "" : "s"} awaiting resolution.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={FileText}
          label="Active quotes"
          value={kpis.activeQuotes.toString()}
          sub={`${reference.tariffs.total} tariff rules · ${reference.lanes.total} lanes`}
          href="/admin/quotes?stage=active"
        />
        <Kpi
          icon={Clock}
          label="Expiring ≤ 7 days"
          value={kpis.expiringThisWeek.toString()}
          sub={kpis.expiringThisWeek > 0 ? "Follow up before validity lapses" : "Nothing slipping this week"}
          href="#expiring-quotes"
          warn={kpis.expiringThisWeek > 0}
        />
        <Kpi
          icon={DollarSign}
          label="Pipeline value"
          value={fmtMoney(kpis.pipelineValueMinor)}
          sub="Sum of active ops quotes (quoted + sent)"
        />
        <Kpi
          icon={Percent}
          label="Win rate (30d)"
          value={kpis.winRate30d !== null ? `${(kpis.winRate30d * 100).toFixed(0)}%` : "—"}
          sub={`${kpis.decisions30d} decisions`}
        />
      </div>

      {/* Middle row: expiring quotes + expiring lanes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="expiring-quotes">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" /> Quotes expiring ≤ 7 days
            </CardTitle>
            <CardDescription>
              Ops-originated quotes whose validity lapses soon. Follow up or re-quote before they go stale.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringQuotes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Nothing expiring in the next 7 days.
              </div>
            ) : (
              <ul className="divide-y text-sm">
                {expiringQuotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={q.detailUrl} className="font-mono text-xs hover:underline">{q.number}</Link>
                        <span className="truncate text-sm">{q.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Valid until <span className="font-medium text-foreground">{q.validUntil}</span>
                        {q.quotedMinor != null && (
                          <> · {fmtMoney(q.quotedMinor, q.currency ?? "USD")}</>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={q.detailUrl}><ArrowRight className="size-4" /></Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ship className="size-4" /> Lanes expiring ≤ 14 days
            </CardTitle>
            <CardDescription>
              Freight-lane rates about to lapse. Re-quote the carrier/forwarder or extend before they&apos;re unusable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringLanes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                All active lanes are valid for 14+ days.
              </div>
            ) : (
              <ul className="divide-y text-sm">
                {expiringLanes.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{l.lane}</div>
                      <div className="text-xs text-muted-foreground">
                        Valid until <span className="font-medium text-foreground">{l.validTo}</span>
                        {l.provider ? ` · ${l.provider}` : ""}
                        <Badge variant="outline" className="ml-1 text-[10px]">{l.source.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reference-data health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" /> Reference data coverage
          </CardTitle>
          <CardDescription>
            What the engine has to compute against. Gaps here produce engine warnings on quotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Mini
              label="Ports"
              value={reference.ports.total}
              sub={`${reference.ports.origin} origin · ${reference.ports.destination} destination`}
            />
            <Mini
              label="Freight lanes"
              value={reference.lanes.total}
              sub={reference.lanes.expiringIn30Days > 0
                ? `${reference.lanes.expiringIn30Days} expiring in 30d`
                : "All fresh"}
              warn={reference.lanes.expiringIn30Days > 0}
            />
            <Mini
              label="Tariff rules"
              value={reference.tariffs.total}
              sub={`Covering ${Object.keys(reference.tariffs.byCountry).length} destination countries`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Lane sources</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reference.lanes.bySource).length === 0 ? (
                  <span className="text-sm text-muted-foreground">No active lanes.</span>
                ) : (
                  Object.entries(reference.lanes.bySource).map(([source, count]) => (
                    <Badge key={source} variant="secondary">
                      {source.replace(/_/g, " ")}: {count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Tariff rules by country</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(reference.tariffs.byCountry).length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                    <AlertTriangle className="size-3" />
                    No tariff data seeded yet — engine will set duty/VAT to 0 for every HS code.
                  </span>
                ) : (
                  Object.entries(reference.tariffs.byCountry)
                    .sort((a, b) => b[1] - a[1])
                    .map(([country, count]) => (
                      <Badge key={country} variant="outline">{country}: {count}</Badge>
                    ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  href,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  href?: string;
  warn?: boolean;
}) {
  const content = (
    <Card className={warn ? "border-amber-300 dark:border-amber-700" : undefined}>
      <CardContent className="px-6">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <Icon className={`size-4 ${warn ? "text-amber-600" : "text-muted-foreground"}`} />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function Mini({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: number;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-md border p-3 ${warn ? "border-amber-300 dark:border-amber-700" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
