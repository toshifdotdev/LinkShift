import { Link } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiPlan, ApiSubscription, BillingCycle, Currency } from "@/api/billing";
import {
  currencySymbol,
  FLAG_ROWS,
  formatPrice,
  LIMIT_ROWS,
  PLAN_AUDIENCE,
} from "../plan-presentation";
import { FlagIndicator } from "./flag-indicator";
import { cn } from "@/lib/utils";

interface PlanStackProps {
  plans: ApiPlan[];
  cycle: BillingCycle;
  currency: Currency;
  subscription: ApiSubscription | null;
  loadingPlan: string | null;
  onSubscribe: (planName: string) => void;
}

function PlanStack({ plans, cycle, currency, subscription, loadingPlan, onSubscribe }: PlanStackProps) {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      {plans.map((plan) => (
        <PlanBlock
          key={plan.name}
          plan={plan}
          cycle={cycle}
          currency={currency}
          subscription={subscription}
          loadingPlan={loadingPlan}
          onSubscribe={onSubscribe}
        />
      ))}
    </div>
  );
}

function PlanBlock({
  plan,
  cycle,
  currency,
  subscription,
  loadingPlan,
  onSubscribe,
}: {
  plan: ApiPlan;
  cycle: BillingCycle;
  currency: Currency;
  subscription: ApiSubscription | null;
  loadingPlan: string | null;
  onSubscribe: (planName: string) => void;
}) {
  const sym = currencySymbol(currency);
  const featured = plan.name === "CREATOR";
  const isCurrent =
    !!subscription &&
    subscription.plan?.name === plan.name &&
    subscription.status !== "AUTHORIZATION_PENDING";

  const price =
    plan.monthlyPrice === 0 || plan.name === "FREE"
      ? 0
      : cycle === "YEARLY"
        ? Math.round((plan.yearlyPrice ?? 0) / 12)
        : (plan.monthlyPrice ?? 0);

  const note =
    plan.name === "FREE"
      ? "free forever"
      : cycle === "YEARLY"
        ? `${sym}${formatPrice(plan.yearlyPrice ?? 0, currency)} billed yearly`
        : "billed monthly";

  const isCurrentActive =
    isCurrent && subscription?.status === "ACTIVE" && !subscription.pendingPlan;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-surface",
        featured ? "border-brand/40" : "border-border",
      )}
    >
      <div className={cn("border-b border-border p-5", featured && "bg-brand/[0.04]")}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
          </h2>
          {featured && <Badge variant="ember">Popular</Badge>}
          {isCurrent && <Badge variant="success">Current</Badge>}
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-medium tracking-tight tabular-nums">
            {sym}
            {formatPrice(price, currency)}
          </span>
          <span className="text-xs text-fg-muted">/mo</span>
        </div>
        <p className="mt-1 font-mono text-[10px] tracking-wide text-fg-muted uppercase">{note}</p>
        <p className="mt-1 text-xs text-fg-muted">{PLAN_AUDIENCE[plan.name] ?? ""}</p>

        {subscription?.plan?.name === plan.name &&
          subscription.cancelAtPeriodEnd &&
          subscription.currentPeriodEnd && (
            <p className="mt-2 font-mono text-[10px] tracking-wide text-warning uppercase">
              Cancels {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
      </div>

      <dl className="grid grid-cols-2 gap-y-2.5 p-5">
        {LIMIT_ROWS.map((row) => {
          const value = row.value(plan);
          return (
            <div key={row.key} className="flex flex-col">
              <dt className="text-[11px] text-fg-muted">{row.label}</dt>
              <dd
                className={cn(
                  "font-mono text-sm tabular-nums",
                  value === "—" ? "text-fg-muted" : "text-foreground",
                )}
              >
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="border-t border-border px-5 py-4">
        <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
          Capabilities
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {FLAG_ROWS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-secondary">{row.label}</span>
              <FlagIndicator value={row.values[plan.name] ?? false} />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border p-4">
        {plan.name === "FREE" ? <FreeCta /> : (
          <Button
            variant={featured ? "default" : "secondary"}
            size="lg"
            className="w-full"
            disabled={isCurrentActive}
            loading={loadingPlan === plan.name}
            onClick={() => onSubscribe(plan.name)}
          >
            {isCurrentActive
              ? "Current plan"
              : `Choose ${plan.name.charAt(0)}${plan.name.slice(1).toLowerCase()}`}
          </Button>
        )}
      </div>
    </article>
  );
}

function FreeCta() {
  const { isAuthenticated } = useSession();
  return (
    <Link to={isAuthenticated ? "/app" : "/register"} className="block">
      <Button variant="secondary" size="lg" className="w-full">
        {isAuthenticated ? "Go to dashboard" : "Start free"}
      </Button>
    </Link>
  );
}

export { PlanStack };
