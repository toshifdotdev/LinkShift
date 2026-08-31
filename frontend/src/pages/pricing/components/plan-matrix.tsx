import { Link } from "react-router-dom";
import { useSession } from "@/auth/session";
import { AnimatePresence, motion } from "framer-motion";
import { Lamp } from "@/components/ui/lamp";
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

const GRID = "grid grid-cols-[minmax(9.5rem,1.15fr)_repeat(4,minmax(0,1fr))]";

/* Continuous highlighted-column treatment: identical surface + hairline rails
   on the Creator cell of EVERY row, so the column reads as one structure
   from cap line to bottom border. */
const CREATOR_CELL = "relative bg-brand/[0.045] border-x border-brand/25";
const CELL = "px-2 lg:px-4";

interface PlanMatrixProps {
  plans: ApiPlan[];
  cycle: BillingCycle;
  currency: Currency;
  subscription: ApiSubscription | null;
  loadingPlan: string | null;
  onSubscribe: (planName: string) => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="pt-8 pb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-fg-muted uppercase first:pt-0">
      {children}
    </p>
  );
}

function PlanMatrix({ plans, cycle, currency, subscription, loadingPlan, onSubscribe }: PlanMatrixProps) {
  return (
    <div className="relative hidden md:block">
      {/* header — cells fill row height so the creator tint reaches the cap */}
      <div className={cn(GRID, "items-stretch border-b border-border")}>
        <div />
        {plans.map((plan) => (
          <PlanHeaderCell
            key={plan.name}
            plan={plan}
            cycle={cycle}
            currency={currency}
            subscription={subscription}
          />
        ))}
      </div>

      {/* CTA row — vertical padding lives INSIDE cells so the creator
          surface is uninterrupted behind the button */}
      <div className={cn(GRID, "items-stretch border-b border-border")}>
        <div className="py-4" />
        {plans.map((plan) => (
          <PlanCtaCell
            key={plan.name}
            plan={plan}
            subscription={subscription}
            loadingPlan={loadingPlan}
            onSubscribe={onSubscribe}
          />
        ))}
      </div>

      {/* quotas */}
      <div className={GRID}>
        <SectionLabel>Usage</SectionLabel>
        {plans.map((plan) => (
          <span key={plan.name} className={plan.name === "CREATOR" ? CREATOR_CELL : undefined} />
        ))}
      </div>
      <div className="border-t border-border">
        {LIMIT_ROWS.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              GRID,
              "group/row transition-colors duration-150 hover:bg-elevated/40",
              i > 0 && "border-t border-border",
            )}
          >
            <div className="flex items-center py-3 pr-4">
              <span className="text-[13px] text-fg-secondary">{row.label}</span>
            </div>
            {plans.map((plan) => {
              const value = row.value(plan);
              const strong = plan.name === "CREATOR" && value !== "—";
              return (
                <div
                  key={plan.name}
                  className={cn(
                    "flex items-center justify-center py-3 transition-colors duration-150",
                    plan.name === "CREATOR"
                      ? cn(CREATOR_CELL, "group-hover/row:bg-brand/[0.065]")
                      : "",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      value === "—" ? "text-fg-muted" : "text-foreground",
                      strong && "font-medium",
                    )}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* capabilities */}
      <div className={GRID}>
        <SectionLabel>Capabilities</SectionLabel>
        {plans.map((plan) => (
          <span key={plan.name} className={plan.name === "CREATOR" ? CREATOR_CELL : undefined} />
        ))}
      </div>
      <div className="border-y border-border">
        {FLAG_ROWS.map((row, i) => {
          const isLast = i === FLAG_ROWS.length - 1;
          return (
            <div
              key={row.label}
              className={cn(
                GRID,
                "group/row transition-colors duration-150 hover:bg-elevated/40",
                i > 0 && "border-t border-border",
              )}
            >
              <div className="py-3 pr-4">
                <p className="text-[13px] text-fg-secondary">{row.label}</p>
                {row.note && (
                  <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{row.note}</p>
                )}
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex items-center justify-center py-3 transition-colors duration-150",
                    plan.name === "CREATOR"
                      ? cn(
                          CREATOR_CELL,
                          "group-hover/row:bg-brand/[0.065]",
                          isLast && "rounded-b-lg border-b border-brand/25",
                        )
                      : "",
                  )}
                >
                  <FlagIndicator value={row.values[plan.name] ?? false} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-right font-mono text-[10px] tracking-wide text-fg-muted uppercase">
        — not included · grace band applies before monthly cutoffs
      </p>
    </div>
  );
}

function PlanHeaderCell({
  plan,
  cycle,
  currency,
  subscription,
}: {
  plan: ApiPlan;
  cycle: BillingCycle;
  currency: Currency;
  subscription: ApiSubscription | null;
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
        ? `${sym}${formatPrice(plan.yearlyPrice ?? 0, currency)} / yr`
        : "billed monthly";

  return (
    <div
      className={cn(
        CELL,
        "flex h-full flex-col justify-end pt-5 pb-4",
        featured && CREATOR_CELL,
        featured && "rounded-t-lg border-t-2 border-t-brand",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
        </h2>
        {featured && <Lamp tone="ember">Popular</Lamp>}
        {isCurrent && <Lamp tone="success">Current</Lamp>}
        {subscription?.status === "AUTHORIZATION_PENDING" &&
          subscription.plan?.name === plan.name && <Lamp tone="neutral">Setup pending</Lamp>}
      </div>

      <p className="mt-1 min-h-8 text-xs leading-snug text-fg-muted">
        {PLAN_AUDIENCE[plan.name] ?? ""}
      </p>

      <div className="mt-4 flex items-baseline gap-1.5 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${plan.name}-${cycle}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="font-display text-3xl font-medium tracking-tight tabular-nums"
          >
            {sym}
            {formatPrice(price, currency)}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs text-fg-muted">/mo</span>
      </div>
      <p className="mt-1 h-4 font-mono text-[10px] tracking-wide text-fg-muted uppercase">{note}</p>

      {(() => {
        const sub = subscription;
        if (!sub || sub.plan?.name !== plan.name) return null;
        return (
          <>
            {sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
              <p className="mt-2 font-mono text-[10px] tracking-wide text-warning uppercase">
                Cancels {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {!sub.cancelAtPeriodEnd && sub.pendingPlan && (
              <p className="mt-2 font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                → {String(sub.pendingPlan.name).toLowerCase()} scheduled
              </p>
            )}
          </>
        );
      })()}
    </div>
  );
}

function PlanCtaCell({
  plan,
  subscription,
  loadingPlan,
  onSubscribe,
}: {
  plan: ApiPlan;
  subscription: ApiSubscription | null;
  loadingPlan: string | null;
  onSubscribe: (planName: string) => void;
}) {
  if (plan.name === "FREE") {
    return (
      <div className={cn(CELL, "py-4")}>
        <FreeCta />
      </div>
    );
  }

  const isCurrent =
    !!subscription &&
    subscription.plan?.name === plan.name &&
    subscription.status === "ACTIVE" &&
    !subscription.pendingPlan;

  return (
    <div
      className={cn(
        CELL,
        "flex items-center py-4",
        plan.name === "CREATOR" && CREATOR_CELL,
      )}
    >
      <Button
        variant={
          plan.name === "CREATOR" ? "default" : plan.name === "STARTER" ? "secondary" : "outline"
        }
        size="md"
        className="w-full"
        disabled={isCurrent}
        loading={loadingPlan === plan.name}
        onClick={() => onSubscribe(plan.name)}
      >
        {isCurrent
          ? "Current plan"
          : `Choose ${plan.name.charAt(0)}${plan.name.slice(1).toLowerCase()}`}
      </Button>
    </div>
  );
}

function FreeCta() {
  const { isAuthenticated } = useSession();
  return (
    <Link to={isAuthenticated ? "/app" : "/register"} className="block">
      <Button variant="secondary" size="md" className="w-full">
        {isAuthenticated ? "Go to dashboard" : "Start free"}
      </Button>
    </Link>
  );
}

export { PlanMatrix };
