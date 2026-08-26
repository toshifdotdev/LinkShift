import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Link2, Lock, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getActivity, getLinkAnalytics, getLinkCharts, getStats, exportLinkCsv } from "@/api/dashboard";
import type { AnalyticsDays } from "@/types/api";
import { getLink, listLinks } from "@/api/links";
import { useSession } from "@/auth/session";
import { ErrorState, PageHeader } from "@/components/app/page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { shortUrl } from "@/lib/short-url";
import { useCountUp } from "@/lib/use-count-up";
import { cn } from "@/lib/utils";
import { BreakdownPanel } from "./breakdown-panel";
import { RANGE_OPTIONS, RangeSelect, planRank, rangeLocked } from "./range-select";
import { TimeSeriesChart } from "./time-series-chart";

/* ---------- shared bits ---------- */

function KpiCard({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: number;
  accent?: boolean;
  loading?: boolean;
}) {
  const display = useCountUp(value, !loading, 700);
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">{label}</p>
      {loading ? (
        <Skeleton className="mt-2.5 h-8 w-16" />
      ) : (
        <p
          className={cn(
            "font-display mt-2 text-3xl font-semibold tracking-tight tabular-nums",
            accent && "text-brand",
          )}
        >
          {display.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function LockedRangeBanner({ days, minPlan }: { days: number; minPlan: string }) {
  const label = RANGE_OPTIONS.find((r) => r.days === days)?.label ?? `${days}d`;
  const planLabel = minPlan === "STARTER" ? "Starter" : minPlan === "CREATOR" ? "Creator" : "Pro";
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-brand/25 bg-brand/[0.05] px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand">
        <Lock className="size-4" />
      </span>
      <p className="font-display text-lg font-medium text-foreground">
        {label} history needs {planLabel}
      </p>
      <p className="max-w-sm text-sm text-fg-muted">
        Your current plan keeps a shorter analytics window. Upgrade to unlock {label} of history
        across every link.
      </p>
      <Link
        to="/pricing"
        className="mt-1 inline-flex h-9 items-center rounded-md border border-brand/40 bg-brand/[0.09] px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/75 hover:bg-brand/[0.16]"
      >
        View plans →
      </Link>
    </div>
  );
}

/* ---------- account view ---------- */

function AccountView({ days }: { days: AnalyticsDays }) {
  const [, setSearchParams] = useSearchParams();
  const [drillSearch, setDrillSearch] = useState("");

  const stats = useQuery({
    queryKey: ["stats", days],
    queryFn: () => getStats(days),
    select: (d) => d.data,
  });
  const activity = useQuery({
    queryKey: ["activity", days],
    queryFn: () => getActivity(days),
    select: (d) => d.data,
  });
  const drillLinks = useQuery({
    queryKey: ["links", { drilldown: drillSearch }],
    queryFn: () => listLinks({ page: 1, limit: 50, search: drillSearch || undefined, sort: "clicks", order: "desc" }),
    select: (d) => d.data,
  });

  function openLink(id: string) {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set("link", id); return n; });
  }

  const statsData = stats.data;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total clicks" value={statsData?.totalScans ?? 0} accent loading={stats.isPending} />
        <KpiCard label="Total links" value={statsData?.totalLinks ?? 0} loading={stats.isPending} />
        <KpiCard label="Active links" value={statsData?.activeLinks ?? 0} loading={stats.isPending} />
        <KpiCard label="Inactive links" value={statsData?.inactiveLinks ?? 0} loading={stats.isPending} />
      </div>

      {/* link drill-down — per-link time series & breakdowns live in the workspace */}
      <section aria-label="Open a link workspace" className="mt-6 rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
            Deep-dive a link
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <Input
              value={drillSearch}
              onChange={(e) => setDrillSearch(e.target.value)}
              placeholder="Search links…"
              aria-label="Search links for analytics"
              className="h-8 w-48 pl-9 text-xs"
            />
          </div>
        </header>
        {drillLinks.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : drillLinks.data && drillLinks.data.length > 0 ? (
          <ul className="grid gap-1.5 p-3 sm:grid-cols-2">
            {drillLinks.data.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openLink(l.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-elevated/60"
                >
                  <Link2 className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg-secondary">
                    {l.name ?? "Untitled link"}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-fg-muted tabular-nums">
                    {l.clicks.toLocaleString()} clicks
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-xs text-fg-muted">No links found.</p>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* top links — click opens the link workspace */}
        <section aria-label="Top links" className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
              Top links
            </h2>
            <span className="font-mono text-[9px] tracking-[0.14em] text-fg-muted uppercase">
              {days}d window
            </span>
          </header>
          {stats.isPending ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : stats.isError ? (
            <div className="px-5 py-6">
              <ErrorState
                title="Couldn't load top links"
                message={stats.error instanceof Error ? stats.error.message : undefined}
                onRetry={() => void stats.refetch()}
              />
            </div>
          ) : !statsData || statsData.topLinks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm text-fg-secondary">No clicks recorded in this window.</p>
              <p className="max-w-xs text-xs text-fg-muted">
                Share a link — your best performers rank here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {statsData.topLinks.map((l, i) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => openLink(l.id)}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-elevated/50"
                  >
                    <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {l.name ?? "Untitled link"}
                      </span>
                      <span className="block truncate font-mono text-[11px]">
                        <span className="text-fg-muted">go.linkshift.in/</span>
                        <span className="text-brand">{l.shortId}</span>
                      </span>
                    </span>
                    <span className="font-mono text-sm text-fg-secondary tabular-nums">
                      {l.clicks.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* recent activity */}
        <section aria-label="Recent activity" className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
              Recent activity
            </h2>
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
          </header>
          {activity.isPending ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : activity.isError ? (
            <div className="px-5 py-6">
              <ErrorState
                title="Couldn't load activity"
                message={activity.error instanceof Error ? activity.error.message : undefined}
                onRetry={() => void activity.refetch()}
              />
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm text-fg-secondary">No scans yet.</p>
              <p className="max-w-xs text-xs text-fg-muted">
                Every scan appears here the moment it happens.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {activity.data.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="size-1.5 shrink-0 rounded-full bg-brand/70" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      {a.link.name ?? "Untitled link"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-fg-muted">
                      {[a.browser, a.os, a.country].filter(Boolean).join(" · ") || "Unknown client"}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-[10px] text-fg-muted">
                    {new Date(a.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
        Per-link time series, geography, devices &amp; UTM breakdowns — open a link above
      </p>
    </>
  );
}

/* ---------- link workspace ---------- */

function LinkWorkspace({ linkId, days }: { linkId: string; days: AnalyticsDays }) {
  const [, setSearchParams] = useSearchParams();
  const { toast } = useToaster();
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  const [exporting, setExporting] = useState(false);

  const linkInfo = useQuery({
    queryKey: ["link", linkId],
    queryFn: () => getLink(linkId),
    select: (d) => d.data,
    retry: false,
  });

  const analytics = useQuery({
    queryKey: ["link-analytics", linkId, days],
    queryFn: () => getLinkAnalytics(linkId, days),
    select: (d) => d.analytics,
  });

  const charts = useQuery({
    queryKey: ["link-charts", linkId, days],
    queryFn: () => getLinkCharts(linkId, days),
    select: (d) => d.data,
  });

  const csvLocked = planRank(plan) < planRank("CREATOR");

  async function handleExport() {
    setExporting(true);
    try {
      await exportLinkCsv(linkId, days);
      toast({ title: "Export ready", description: "CSV downloaded.", variant: "success" });
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  const a = analytics.data;

  const utmRows = a
    ? [
        ...a.utmSource.filter((u) => u.utmSource).map((u) => ({ label: `source · ${u.utmSource}`, count: u.count })),
        ...a.utmMedium.filter((u) => u.utmMedium).map((u) => ({ label: `medium · ${u.utmMedium}`, count: u.count })),
        ...a.utmCampaign.filter((u) => u.utmCampaign).map((u) => ({ label: `campaign · ${u.utmCampaign}`, count: u.count })),
      ]
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete("link"); return n; })}
        className="mb-5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft className="size-3" /> All analytics
      </button>

      <PageHeader
        title={linkInfo.isPending ? "Link analytics" : (linkInfo.data?.name ?? "Link analytics")}
        description={linkInfo.data ? shortUrl(linkInfo.data.shortId) : undefined}
        action={
          csvLocked ? (
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase"
              title="CSV export — Creator and Pro plans"
            >
              <Lock className="size-3 text-brand" /> Export CSV
            </span>
          ) : (
            <Button
              variant="secondary"
              size="md"
              loading={exporting}
              loadingLabel="Exporting…"
              onClick={() => void handleExport()}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total clicks" value={a?.totalClicks ?? 0} accent loading={analytics.isPending} />
      </div>

      <section aria-label="Clicks over time" className="mt-6 rounded-lg border border-border bg-surface p-5">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
            Clicks over time
          </h2>
          <span className="font-mono text-[9px] tracking-[0.14em] text-fg-muted uppercase">
            {days}d window
          </span>
        </header>
        {charts.isError ? (
          <ErrorState
            title="Couldn't load the chart"
            message={charts.error instanceof Error ? charts.error.message : undefined}
            onRetry={() => void charts.refetch()}
          />
        ) : (
          <TimeSeriesChart
            data={charts.data?.dailyStats ?? []}
            loading={charts.isPending}
            emptyTitle="No clicks in this window"
            emptyHint="Share the short link — scans chart here."
          />
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {analytics.isError ? (
          <div className="lg:col-span-2">
            <ErrorState
              title="Couldn't load breakdowns"
              message={analytics.error instanceof Error ? analytics.error.message : undefined}
              onRetry={() => void analytics.refetch()}
            />
          </div>
        ) : (
          <>
            <BreakdownPanel
              title="Countries"
              items={(a?.countryStats ?? []).map((c) => ({ label: c.country ?? "Unknown", count: c.count }))}
              loading={analytics.isPending}
              emptyText="No geographic data yet."
            />
            <BreakdownPanel
              title="Devices"
              items={(a?.deviceStats ?? []).map((d) => ({ label: d.device ?? "Unknown", count: d.count }))}
              loading={analytics.isPending}
              emptyText="No device data yet."
            />
            <BreakdownPanel
              title="Browsers"
              items={(a?.browserStats ?? []).map((b) => ({ label: b.browser ?? "Unknown", count: b.count }))}
              loading={analytics.isPending}
              emptyText="No browser data yet."
            />
            <BreakdownPanel
              title="Operating systems"
              items={(a?.osStats ?? []).map((o) => ({ label: o.os ?? "Unknown", count: o.count }))}
              loading={analytics.isPending}
              emptyText="No OS data yet."
            />
            {utmRows.length > 0 && (
              <BreakdownPanel
                title="UTM campaigns"
                items={utmRows}
                loading={analytics.isPending}
                className="lg:col-span-2"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ---------- page ---------- */

function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";

  const linkId = searchParams.get("link");
  const rangeParam = Number(searchParams.get("range") ?? 30);
  const rangeOption = RANGE_OPTIONS.find((r) => r.days === rangeParam) ?? RANGE_OPTIONS[1];
  const validRange = rangeOption.days;
  const [pendingLock, setPendingLock] = useState<{ days: number; minPlan: string } | null>(null);

  const rangeLockedNow = rangeLocked(rangeOption, plan);

  /* if the URL carries a locked range, surface the banner instead of a
     guaranteed 403 fetch */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPendingLock(rangeLockedNow ? { days: validRange, minPlan: rangeOption.minPlan } : null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [rangeLockedNow, validRange, rangeOption]);

  function handleRangeChange(days: number) {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set("range", String(days)); return n; }, { replace: true });
  }

  function handleLocked(days: number, minPlan: string) {
    setPendingLock({ days, minPlan });
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="See what happens after every link is shared."
        action={
          <RangeSelect
            value={validRange}
            plan={plan}
            onChange={handleRangeChange}
            onLocked={handleLocked}
          />
        }
      />

      {pendingLock ? (
        <LockedRangeBanner days={pendingLock.days} minPlan={pendingLock.minPlan} />
      ) : linkId ? (
        <LinkWorkspace linkId={linkId} days={validRange as AnalyticsDays} />
      ) : (
        <AccountView days={validRange as AnalyticsDays} />
      )}
    </>
  );
}

export { AnalyticsPage };
