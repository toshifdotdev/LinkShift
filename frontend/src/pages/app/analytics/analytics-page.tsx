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
import { FadeIn, NumberTick } from "@/components/ui/motion";
import { shortUrl } from "@/lib/short-url";
import { cn } from "@/lib/utils";
import { BreakdownPanel } from "./breakdown-panel";
import { DonutChart } from "./donut-chart";
import { AreaChart } from "./area-chart";
import { RANGE_OPTIONS, RangeSelect, planRank, rangeLocked } from "./range-select";

/* ---------- shared bits ---------- */

function KpiCell({
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
  return (
    <div className="relative flex flex-1 flex-col gap-2 px-1">
      <p className="ls-marquee">
        <span>{label}</span>
      </p>
      {loading ? (
        <Skeleton variant="kpi" className="mt-1" />
      ) : (
        <NumberTick
          value={value}
          active={true}
          duration={700}
          className={cn(
            "font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums",
            accent ? "text-brand" : "text-foreground",
          )}
        />
      )}
    </div>
  );
}

function LockedRangeBanner({ days, minPlan }: { days: number; minPlan: string }) {
  const label = RANGE_OPTIONS.find((r) => r.days === days)?.label ?? `${days}d`;
  const planLabel = minPlan === "STARTER" ? "Starter" : minPlan === "CREATOR" ? "Creator" : "Pro";
  return (
    <section className="relative overflow-hidden rounded-xl border border-brand/25 bg-brand/[0.05] p-8 text-center sm:p-10">
      <span aria-hidden="true" className="ls-stripe" />
      <span className="mx-auto flex size-10 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand">
        <Lock className="size-4" />
      </span>
      <p className="mt-4 font-display text-lg font-medium tracking-tight text-foreground">
        {label} of history. Available on {planLabel}.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-secondary">
        Your current plan keeps a shorter window. Upgrade to unlock {label} of history across every link.
      </p>
      <Link
        to="/pricing"
        className="mt-5 inline-flex h-9 items-center rounded-md border border-brand/40 bg-brand/[0.09] px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/75 hover:bg-brand/[0.16]"
      >
        View plans
      </Link>
    </section>
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
      <section
        aria-label="Headline numbers"
        className="relative overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
          <p className="ls-marquee">Headline</p>
          <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
            {days}D window
          </span>
        </header>
        <div className="grid grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
          <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
            <p className="ls-marquee">Clicks</p>
            <NumberTick
              value={statsData?.totalScans ?? 0}
              className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-brand"
            />
          </div>
          <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
            <p className="ls-marquee">Total links</p>
            <NumberTick
              value={statsData?.totalLinks ?? 0}
              className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
            />
          </div>
          <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
            <p className="ls-marquee">Active</p>
            <NumberTick
              value={statsData?.activeLinks ?? 0}
              className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
            />
          </div>
          <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
            <p className="ls-marquee">Inactive</p>
            <NumberTick
              value={statsData?.inactiveLinks ?? 0}
              className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
            />
          </div>
        </div>
      </section>

      {/* link drill-down — per-link time series & breakdowns live in the workspace */}
      <section
        aria-label="Pick a link"
        className="mt-6 relative overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3 sm:px-6">
          <p className="ls-marquee">Pick a link</p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <Input
              value={drillSearch}
              onChange={(e) => setDrillSearch(e.target.value)}
              placeholder="Search links"
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
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-elevated/60"
                >
                  <Link2 className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg-secondary">
                    {l.name ?? "Untitled link"}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-fg-muted tabular-nums">
                    {l.clicks.toLocaleString()} clicks
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-xs text-fg-muted">No links match that search.</p>
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* top links — click opens the link workspace */}
        <section
          aria-label="Top links"
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
        >
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
            <p className="ls-marquee">Top links</p>
            <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
              {days}D window
            </span>
          </header>
          {stats.isPending ? (
            <div className="space-y-3 p-5 sm:px-6 sm:py-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="size-1.5 rotate-45" />
                  <Skeleton variant="row" className="max-w-[18rem]" />
                  <Skeleton variant="row" className="ml-auto w-16" />
                </div>
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
            <div className="px-6 py-10 text-center">
              <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
                Empty ledger
              </p>
              <p className="mt-3 font-display text-[15px] font-medium tracking-tight text-foreground">
                No clicks in this window.
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-fg-muted">
                Share a link. Your best performers rank here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {statsData.topLinks.map((l, i) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => openLink(l.id)}
                    className="group flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-elevated/50 sm:px-6"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 rotate-45 rounded-[1px] transition-transform group-hover:scale-150",
                        i === 0 ? "bg-brand" : i === 1 ? "bg-amber-400" : i === 2 ? "bg-emerald-400" : "bg-fg-muted",
                      )}
                    />
                    <span className="font-mono text-[10px] tracking-[0.16em] text-fg-muted tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-foreground">
                        {l.name ?? "Untitled link"}
                      </span>
                      <span className="block truncate font-mono text-[11px] tracking-[0.04em]">
                        <span className="text-fg-muted/70">go.linkshift.in/</span>
                        <span className="text-foreground">{l.shortId}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-sm tabular-nums">
                      <span className="text-foreground">{l.clicks.toLocaleString()}</span>
                      <span className="ml-1.5 text-[10px] tracking-[0.14em] text-fg-muted uppercase">clicks</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* recent activity */}
        <section
          aria-label="Activity"
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
        >
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
            <p className="ls-marquee">Activity</p>
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400/60 ls-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
          </header>
          {activity.isPending ? (
            <div className="space-y-3 p-5 sm:px-6 sm:py-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="size-1.5 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
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
            <div className="px-6 py-10 text-center">
              <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
                Quiet
              </p>
              <p className="mt-3 font-display text-[15px] font-medium tracking-tight text-foreground">
                No scans yet.
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-fg-muted">
                Every scan lands here the moment it happens.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {activity.data.map((a) => (
                <li key={a.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated/50 sm:px-6">
                  <span aria-hidden="true" className="relative flex size-1.5 shrink-0">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/60 ls-ping" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      {a.link.name ?? "Untitled link"}
                    </p>
                    <p className="truncate font-mono text-[10px] tracking-[0.04em] text-fg-muted">
                      {[a.browser, a.os, a.country].filter(Boolean).join(" · ") || "Unknown client"}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-fg-muted">
                    {new Date(a.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">
        Per-link time series, geography, devices, and UTM breakdowns. Open a link above.
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
      const shortId = linkInfo.data?.shortId ?? linkId;
      await exportLinkCsv(linkId, days, `linkshift-${shortId}-scans`);
      toast({ title: "Export ready", description: "Downloaded.", variant: "success" });
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
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
              title="Available on Creator and Pro"
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

      <section
        aria-label="Total clicks"
        className="relative overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
          <p className="ls-marquee">Clicks</p>
          <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
            {days}D window
          </span>
        </header>
        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <KpiCell
            label="Total clicks"
            value={a?.totalClicks ?? 0}
            accent
            loading={analytics.isPending}
          />
        </div>
      </section>

      <section
        aria-label="Clicks over time"
        className="mt-6 relative overflow-hidden rounded-xl border border-border bg-surface p-5"
      >
        <header className="mb-5 flex items-center justify-between">
          <p className="ls-marquee">Clicks over time</p>
          <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
            {days}D window
          </span>
        </header>
        {charts.isError ? (
          <ErrorState
            title="Couldn't load the chart"
            message={charts.error instanceof Error ? charts.error.message : undefined}
            onRetry={() => void charts.refetch()}
          />
        ) : (
          <AreaChart
            data={charts.data?.dailyStats ?? []}
            loading={charts.isPending}
            emptyTitle="No clicks in this window"
            emptyHint="Share the short link. Scans chart here."
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
            <DonutChart
              title="Devices"
              items={(a?.deviceStats ?? []).map((d) => ({ label: d.device ?? "Unknown", count: d.count }))}
              loading={analytics.isPending}
              emptyText="No device data yet."
            />
            <BreakdownPanel
              title="Countries"
              items={(a?.countryStats ?? []).map((c) => ({ label: c.country ?? "Unknown", count: c.count }))}
              loading={analytics.isPending}
              emptyText="No geo data yet."
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
    <FadeIn>
      <PageHeader
        title="Analytics"
        description="What happens after every link is shared."
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
    </FadeIn>
  );
}

export { AnalyticsPage };
