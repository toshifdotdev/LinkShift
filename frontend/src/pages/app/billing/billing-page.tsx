import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CreditCard, Download, FileEdit, Globe, Link2, Pencil, QrCode } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cancelSubscription, getBillingUsage } from "@/api/billing";
import { useSession } from "@/auth/session";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState, PageHeader } from "@/components/app/page-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { FadeIn } from "@/components/ui/motion";
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
      return { label: "Awaiting payment", tone: "muted", note: "Complete checkout to activate" };
    case "PAYMENT_RETRY":
      return { label: "Payment retry", tone: "warning", note: "A charge failed. The provider is retrying." };
    case "HALTED":
      return { label: "Halted", tone: "destructive", note: "Retries exhausted. Update payment to resume." };
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

function renewalCountdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day until renewal";
  return `${days} days until renewal`;
}

/* ---------- page ---------- */

function BillingPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const [cancelOpen, setCancelOpen] = useState(false);

  const sub = user?.subscription ?? null;
  const planName = user?.plan.name ?? "FREE";
  const renewal = renewalCountdown(sub?.currentPeriodEnd);

  /* Usage & limits come from the single billing-usage contract; every cap is
     the real plan value the backend enforces (unlimited = null cap). */
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

  const isPaid = planName !== "FREE";
  const status = statusInfo(sub);

  return (
    <FadeIn>
      <PageHeader
        title="Billing"
        description="Your subscription, usage, and plan limits. All in one place."
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

      {/* current plan — the editorial hero */}
      <section
        aria-label="Current plan"
        className="relative overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="ls-marquee">Current plan</p>
            <p className="font-display mt-2 text-3xl font-semibold tracking-[-0.02em] text-foreground">
              {planName.charAt(0) + planName.slice(1).toLowerCase()}
            </p>
            {renewal && (
              <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">
                {renewal}
              </p>
            )}
          </div>
          <Badge shape="mark" variant={status.tone === "destructive" ? "danger" : status.tone === "warning" ? "warning" : status.tone === "success" ? "success" : "neutral"}>
            {status.label}
          </Badge>
        </div>

        {status.note && (
          <p className="border-t border-border/60 px-5 py-3 text-[13px] text-fg-secondary sm:px-6">
            {status.note}
          </p>
        )}

        <dl className="grid gap-x-8 gap-y-3 border-t border-border/60 px-5 py-4 text-[13px] sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <div>
            <dt className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">Cycle</dt>
            <dd className="mt-0.5 capitalize text-foreground">
              {sub?.billingCycle?.toLowerCase() ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">Period ends</dt>
            <dd className="mt-0.5 text-foreground">{fmtDate(sub?.currentPeriodEnd ?? null)}</dd>
          </div>
          {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
            <div>
              <dt className="font-mono text-[9px] tracking-[0.18em] text-amber-300/90 uppercase">Cancels</dt>
              <dd className="mt-0.5 text-amber-300">
                Access ends {fmtDate(sub.currentPeriodEnd)}
              </dd>
            </div>
          )}
        </dl>

        {/* cancel action */}
        {isPaid && sub?.status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3.5 sm:px-6">
            <p className="text-[11px] text-fg-muted">
              Access continues until the end of the paid period.
            </p>
            <Button variant="ghost" size="sm" className="text-fg-muted" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
          </div>
        )}
      </section>

      {/* usage */}
      <section
        aria-label="Usage"
        className="mt-6 relative overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <header className="border-b border-border/60 px-5 py-3 sm:px-6">
          <p className="ls-marquee">Usage</p>
        </header>

        {usage.isError ? (
          <ErrorState
            title="Couldn't load your usage"
            message={usage.error instanceof Error ? usage.error.message : undefined}
            onRetry={() => void usage.refetch()}
          />
        ) : usage.isPending || !usage.data ? (
          <div className="divide-y divide-border/40 px-5 sm:px-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="size-7 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            <UsageRow
              icon={<Link2 className="size-3.5" />}
              label="Short links"
              used={usage.data.links.used}
              cap={usage.data.links.cap}
            />
            <UsageRow
              icon={<ArrowUpRight className="size-3.5" />}
              label="Redirects / month"
              used={usage.data.redirects.used}
              cap={usage.data.redirects.cap}
            />
            <UsageRow
              icon={<Pencil className="size-3.5" />}
              label="Custom slugs / month"
              used={usage.data.customSlugs.used}
              cap={usage.data.customSlugs.cap}
            />
            <UsageRow
              icon={<FileEdit className="size-3.5" />}
              label="Destination edits / month"
              used={usage.data.destinationEdits.used}
              cap={usage.data.destinationEdits.cap}
            />
            <UsageRow
              icon={<Globe className="size-3.5" />}
              label="Custom domains"
              used={usage.data.domains.used}
              cap={usage.data.domains.cap}
            />
            <UsageRow
              icon={<QrCode className="size-3.5" />}
              label="QR codes / month"
              used={usage.data.qrCodes.used}
              cap={usage.data.qrCodes.cap}
            />
            <UsageRow
              icon={<Download className="size-3.5" />}
              label="Analytics history"
              used={null}
              cap={usage.data.analyticsDays}
              capLabel={usage.data.analyticsDays >= 365 ? `${Math.round(usage.data.analyticsDays / 365)} yr` : `${usage.data.analyticsDays} days`}
            />
          </div>
        )}
      </section>

      {/* plan comparison link */}
      <section className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4 sm:px-6">
        <div>
          <p className="text-[13px] font-medium text-foreground">Compare plans</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Full feature comparison, pricing, and checkout.
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
        description="Your plan stays active until the end of the current billing period. After that, your account reverts to the Free plan."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        destructive
        loading={cancel.isPending}
        onConfirm={() => { void cancel.mutateAsync(); }}
      />
    </FadeIn>
  );
}

/* ---------- usage row ---------- */

function UsageRow({
  icon,
  label,
  used,
  cap,
  capLabel,
}: {
  icon: React.ReactNode;
  label: string;
  used: number | null;
  cap: number | null;
  capLabel?: string;
}) {
  const unlimited = cap === null;
  const pct = unlimited || cap === 0 ? 0 : Math.min(((used ?? 0) / cap) * 100, 100);
  const nearCap = !unlimited && cap !== 0 && pct >= 80;

  return (
    <div className="flex items-center gap-4 py-3.5 px-5 sm:px-6">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-elevated text-fg-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-foreground">{label}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-elevated">
          {unlimited ? (
            <div className="h-full w-full rounded-full bg-fg-secondary/30" />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                nearCap ? "bg-amber-400" : "bg-brand",
              )}
              style={{ width: `${Math.max(pct, used !== null && used > 0 ? 4 : 0)}%` }}
            />
          )}
        </div>
      </div>
      <p className="shrink-0 font-mono text-xs tracking-[0.04em] text-fg-secondary tabular-nums">
        {unlimited
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
