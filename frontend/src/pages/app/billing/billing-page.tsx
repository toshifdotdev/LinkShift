import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, CreditCard, Download, FileEdit, Globe, Link2, Pencil, QrCode } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cancelSubscription, getBillingUsage, getPlans } from "@/api/billing";
import { getDomains } from "@/api/domains";
import { useSession } from "@/auth/session";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/app/page-primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/* ---------- status presentation ---------- */

function statusInfo(sub: { status: string; cancelAtPeriodEnd: boolean } | null): {
  label: string;
  tone: "success" | "warning" | "muted" | "destructive";
  note?: string;
} {
  if (!sub) return { label: "Free", tone: "muted" };
  switch (sub.status) {
    case "ACTIVE":
      return sub.cancelAtPeriodEnd
        ? { label: "Active", tone: "warning", note: "Cancels at period end" }
        : { label: "Active", tone: "success" };
    case "AUTHORIZATION_PENDING":
      return { label: "Awaiting payment", tone: "muted", note: "Complete the checkout to activate" };
    case "PAYMENT_RETRY":
      return { label: "Payment retry", tone: "warning", note: "A charge failed — the provider is retrying" };
    case "HALTED":
      return { label: "Halted", tone: "destructive", note: "Retries exhausted — update payment to resume" };
    case "PAUSED":
      return { label: "Paused", tone: "warning" };
    default:
      return { label: sub.status, tone: "muted" };
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/* ---------- page ---------- */

function BillingPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const [cancelOpen, setCancelOpen] = useState(false);

  const sub = user?.subscription ?? null;
  const planName = user?.plan.name ?? "FREE";

  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => getPlans(),
    select: (d) => d.plans,
  });
  const domains = useQuery({
    queryKey: ["domains"],
    queryFn: () => getDomains(),
    select: (d) => d.data.filter((d) => d.userId !== null),
  });

  const usage = useQuery({
    queryKey: ["billing-usage"],
    queryFn: () => getBillingUsage(),
    select: (d) => d.data,
  });

  const cancel = useMutation({
    mutationFn: () => cancelSubscription(true),
    onSuccess: async () => {
      toast({ title: "Subscription cancelled", description: "Access continues until the end of the paid period.", variant: "success" });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
      setCancelOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Cancellation failed", description: err.message, variant: "error" });
    },
  });

  /* current plan limits — from the real plans API (paid) or seeded FREE */
  const currentPlanData = plans.data?.find((p) => p.name === planName);
  const limits = currentPlanData
    ? {
        links: currentPlanData.maxLinks,
        qr: currentPlanData.maxQrPerMonth,
        domains: currentPlanData.maxDomains,
        analyticsDays: currentPlanData.analyticsDays,
      }
    : planName === "FREE"
      ? { links: 50, qr: 10, domains: 0, analyticsDays: 30 }
      : null;

  const isPaid = planName !== "FREE";
  const status = statusInfo(sub);
  const toneClass = {
    success: "text-emerald-300 border-emerald-500/25 bg-emerald-500/10",
    warning: "text-amber-300 border-amber-500/25 bg-amber-500/10",
    muted: "text-fg-secondary border-border bg-elevated",
    destructive: "text-destructive border-destructive/30 bg-destructive/10",
  }[status.tone];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Your subscription, usage and plan limits — all in one place."
        action={
          planName === "FREE" ? (
            <Link to="/pricing">
              <Button size="md">
                <ArrowUpRight className="size-4" />
                Upgrade
              </Button>
            </Link>
          ) : (
            <Link to="/pricing">
              <Button variant="secondary" size="md">
                <ArrowUpRight className="size-4" />
                Change plan
              </Button>
            </Link>
          )
        }
      />

      {/* current plan */}
      <section aria-label="Current plan" className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">Current plan</p>
            <p className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
              {planName.charAt(0) + planName.slice(1).toLowerCase()}
            </p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] tracking-wide uppercase", toneClass)}>
            {status.tone === "warning" && <AlertTriangle className="size-3" />}
            {status.label}
          </span>
        </div>

        {status.note && (
          <p className="mt-3 text-[13px] text-fg-secondary">{status.note}</p>
        )}

        <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-border pt-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-fg-muted">Billing cycle</dt>
            <dd className="mt-0.5 text-foreground capitalize">{sub?.billingCycle?.toLowerCase() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Current period ends</dt>
            <dd className="mt-0.5 text-foreground">{fmtDate(sub?.currentPeriodEnd ?? null)}</dd>
          </div>
          {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
            <div>
              <dt className="text-amber-300/80">Cancellation</dt>
              <dd className="mt-0.5 text-amber-300/90">
                Access ends {fmtDate(sub.currentPeriodEnd)}
              </dd>
            </div>
          )}
        </dl>

        {/* cancel action */}
        {isPaid && sub?.status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
          <div className="mt-5 border-t border-border pt-4">
            <Button variant="ghost" size="sm" className="text-fg-muted" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
            <p className="mt-1 text-[11px] text-fg-muted">
              Access continues until the end of the paid period.
            </p>
          </div>
        )}
      </section>

      {/* usage */}
      <section aria-label="Usage" className="mt-6 rounded-lg border border-border bg-surface">
        <header className="border-b border-border px-5 py-3.5">
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
            Usage & limits
          </h2>
        </header>

        {limits === null || usage.isPending || !usage.data ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <dl className="divide-y divide-border/60 px-5 py-2">
            <UsageRow
              icon={<Link2 className="size-3.5" />}
              label="Short links"
              used={usage.data!.links.used}
              cap={usage.data!.links.cap}
            />
            <UsageRow
              icon={<ArrowUpRight className="size-3.5" />}
              label="Redirects / month"
              used={usage.data!.redirects.used}
              cap={usage.data!.redirects.cap}
            />
            <UsageRow
              icon={<Pencil className="size-3.5" />}
              label="Custom slugs / month"
              used={usage.data!.customSlugs.used}
              cap={usage.data!.customSlugs.cap}
            />
            <UsageRow
              icon={<FileEdit className="size-3.5" />}
              label="Destination edits / month"
              used={usage.data!.destinationEdits.used}
              cap={usage.data!.destinationEdits.cap}
            />
            <UsageRow
              icon={<Globe className="size-3.5" />}
              label="Custom domains"
              used={domains.data?.length ?? 0}
              cap={limits.domains}
            />
            <UsageRow
              icon={<QrCode className="size-3.5" />}
              label="QR codes / month"
              used={null}
              cap={limits.qr}
            />
            <UsageRow
              icon={<Download className="size-3.5" />}
              label="Analytics history"
              used={null}
              cap={limits.analyticsDays}
              capLabel={limits.analyticsDays >= 365 ? `${Math.round(limits.analyticsDays / 365)} yr` : `${limits.analyticsDays} days`}
            />
          </dl>
        )}
      </section>

      {/* plan comparison link */}
      <section aria-label="Available plans" className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4">
        <div>
          <p className="text-[13px] font-medium text-foreground">Compare plans</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Full feature comparison, pricing and checkout.
          </p>
        </div>
        <Link to="/pricing">
          <Button variant="secondary" size="sm">
            <CreditCard className="size-3.5" />
            View plans
          </Button>
        </Link>
      </section>

      {/* cancel confirmation */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel subscription?"
        description="Your plan stays active until the end of the current billing period. After that, your account reverts to the Free plan and paid limits no longer apply. This cannot be undone."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        destructive
        loading={cancel.isPending}
        onConfirm={() => { void cancel.mutateAsync(); }}
      />
    </>
  );
}

/* ---------- usage row ---------- */

function UsageRow({
  icon,
  label,
  used,
  cap,
  capLabel,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  used: number | null;
  cap: number | null;
  capLabel?: string;
  loading?: boolean;
}) {
  const unlimited = cap === null;
  const pct = unlimited || cap === 0 ? 0 : Math.min(((used ?? 0) / cap) * 100, 100);
  const nearCap = !unlimited && cap !== 0 && pct >= 80;

  return (
    <div className="flex items-center gap-4 py-3.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-elevated text-fg-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-1.5 w-3/4 rounded-full" />
        ) : unlimited ? (
          <div className="mt-1.5 h-1 w-full rounded-full bg-elevated">
            <div className="h-full w-full rounded-full bg-fg-secondary/30" />
          </div>
        ) : (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-elevated">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                nearCap ? "bg-amber-400" : "bg-brand",
              )}
              style={{ width: `${Math.max(pct, used !== null && used > 0 ? 4 : 0)}%` }}
            />
          </div>
        )}
      </div>
      <p className="shrink-0 font-mono text-xs text-fg-secondary tabular-nums">
        {loading
          ? "—"
          : unlimited
            ? "Unlimited"
            : capLabel
              ? capLabel
              : used !== null
                ? `${used.toLocaleString()} / ${cap.toLocaleString()}`
                : `0 / ${cap.toLocaleString()}`}
      </p>
    </div>
  );
}

export { BillingPage };
