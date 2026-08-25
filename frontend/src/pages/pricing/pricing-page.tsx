import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingNavbar } from "@/pages/landing/landing-navbar";
import { Footer } from "@/pages/landing/sections/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Kicker } from "@/pages/landing/components/reveal";
import { ApiError } from "@/api/client";
import { getAccessToken } from "@/api/token";
import {
  getPlans,
  getSubscription,
  subscribe,
  verifySubscription,
  type ApiPlan,
  type ApiSubscription,
  type BillingCycle,
  type Currency,
} from "@/api/billing";
import { useToaster } from "@/components/ui/toaster";
import { useSession } from "@/auth/session";
import { BillingToggle } from "./components/billing-toggle";
import { PlanMatrix } from "./components/plan-matrix";
import { PlanStack } from "./components/plan-stack";
import { IncludesBand } from "./components/includes-band";
import { FREE_PLAN, yearlyDiscountPercent } from "./plan-presentation";

const NOTES: Array<[string, string]> = [
  ["UPGRADE NOW", "Upgrades are applied immediately."],
  ["CHANGE AT CYCLE END", "Downgrades and monthly↔yearly switches start next period."],
  ["CANCEL ANYTIME", "Access continues until the end of the paid period."],
  ["REGIONAL PRICING", "INR / USD detected automatically by region."],
  ["DEEP LINKING", "Planned Pro capability — in development."],
  ["ANALYTICS WINDOW", "Lookback capped per plan; older scans stay archived."],
];

function PricingPage() {
  const { toast } = useToaster();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [paidPlans, setPaidPlans] = useState<ApiPlan[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const data = await getPlans();
      if (!data.success) throw new ApiError(0, "Unexpected response");
      setCurrency(data.currency);
      setPaidPlans(data.plans);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to load plans");
    }
  }, []);

  /* Deferred so state updates stay outside the synchronous effect pass. */
  useEffect(() => {
    const t = window.setTimeout(() => void loadPlans(), 0);
    return () => window.clearTimeout(t);
  }, [loadPlans]);

  /* Plan intent carried through login: resume the intended checkout once
     the session exists. Runs once — the intent is consumed on read. */
  const intentDoneRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || intentDoneRef.current) return;
    const raw = sessionStorage.getItem("ls:plan-intent");
    if (!raw) return;
    intentDoneRef.current = true;
    sessionStorage.removeItem("ls:plan-intent");
    try {
      const intent = JSON.parse(raw) as { plan?: string; cycle?: BillingCycle };
      if (intent.plan && (intent.cycle === "MONTHLY" || intent.cycle === "YEARLY")) {
        const plan = intent.plan;
        const cycle = intent.cycle;
        const t = window.setTimeout(() => {
          setCycle(cycle);
          void handleSubscribe(plan as "STARTER" | "CREATOR" | "PRO");
        }, 0);
        return () => window.clearTimeout(t);
      }
    } catch {
      sessionStorage.removeItem("ls:plan-intent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  /* Current-plan awareness only when a session token exists (silent on failure). */
  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    getSubscription()
      .then((data) => {
        if (!cancelled) setSubscription(data.subscription ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo<ApiPlan[]>(
    () => [{ ...FREE_PLAN, currency }, ...paidPlans],
    [paidPlans, currency],
  );
  const discount = useMemo(() => yearlyDiscountPercent(paidPlans), [paidPlans]);

  async function refetchSubscription() {
    try {
      const data = await getSubscription();
      setSubscription(data.subscription ?? null);
    } catch {
      // non-critical refresh
    }
  }

  async function handleSubscribe(planName: string) {
    if (!getAccessToken()) {
      toast({
        title: "Sign in required",
        description: "Create an account first — authentication is coming in the next update.",
        variant: "error",
      });
      return;
    }

    setLoadingPlan(planName);
    try {
      const { result } = await subscribe(
        planName as "STARTER" | "CREATOR" | "PRO",
        cycle,
      );

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        throw new ApiError(0, "Payment library failed to load — check your connection.");
      }

      const checkout = new RazorpayCtor({
        key: result.keyId,
        subscription_id: result.providerSubscriptionId,
        name: "LinkShift",
        description: `${planName.charAt(0)}${planName.slice(1).toLowerCase()} plan · ${cycle === "MONTHLY" ? "monthly" : "yearly"} billing`,
        prefill: {},
        theme: { color: "#E8590C" },
        handler: (response) => {
          void verifyCheckout(response);
        },
      });

      checkout.on("payment.failed", (response) => {
        toast({
          title: "Payment failed",
          description: response?.error?.description ?? "The payment provider reported a failure.",
          variant: "error",
        });
      });

      checkout.open();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        /* Journey: unauthenticated plan selection → auth → straight back
           into the intended checkout. */
        sessionStorage.setItem(
          "ls:plan-intent",
          JSON.stringify({ plan: planName, cycle }),
        );
        navigate("/login", { state: { from: "/pricing" } });
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to start subscription";
      toast({ title: "Checkout unavailable", description: message, variant: "error" });
    } finally {
      setLoadingPlan(null);
    }
  }

  async function verifyCheckout(response: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) {
    try {
      await verifySubscription(response);
      toast({
        title: "Subscription activated",
        description: "Your new plan is live. Welcome aboard.",
        variant: "success",
      });
      await refetchSubscription();
    } catch (err) {
      toast({
        title: "Verification failed",
        description:
          err instanceof Error ? err.message : "We couldn't confirm your payment.",
        variant: "error",
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNavbar />

      <main className="flex-1 pt-28 pb-24 sm:pt-32">
        <Container>
          {/* header */}
          <header className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Kicker>Pricing</Kicker>
              <h1 className="font-display mt-5 text-balance text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.05] font-medium tracking-[-0.02em]">
                Straightforward plans.
                <br />
                <span className="text-fg-muted">Pay for scale,</span>{" "}
                <em className="text-brand italic">not surprises.</em>
              </h1>
              <p className="text-pretty mt-5 text-[15px] leading-relaxed text-fg-secondary">
                Start free, move up when your links earn it. Every limit is written
                down — nothing hidden behind a sales call.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <BillingToggle cycle={cycle} onChange={setCycle} discountPercent={discount} />
              <p className="font-mono text-[11px] tracking-[0.14em] text-fg-muted uppercase">
                Prices in {currency}
              </p>
            </div>
          </header>

          {/* body */}
          {status === "loading" && <PricingSkeleton />}

          {status === "error" && (
            <div className="mt-16 flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-16 text-center">
              <p className="font-mono text-[11px] tracking-[0.18em] text-destructive uppercase">
                Plans unavailable
              </p>
              <p className="mt-3 max-w-sm text-sm text-fg-secondary">{errorMessage}</p>
              <Button
                variant="outline"
                size="md"
                className="mt-6"
                onClick={() => {
                  setStatus("loading");
                  setErrorMessage(null);
                  void loadPlans();
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && (
            <>
              <div className="mt-12 md:mt-16">
                <PlanMatrix
                  plans={plans}
                  cycle={cycle}
                  currency={currency}
                  subscription={subscription}
                  loadingPlan={loadingPlan}
                  onSubscribe={(name) => void handleSubscribe(name)}
                />
                <PlanStack
                  plans={plans}
                  cycle={cycle}
                  currency={currency}
                  subscription={subscription}
                  loadingPlan={loadingPlan}
                  onSubscribe={(name) => void handleSubscribe(name)}
                />
              </div>

              <div className="mt-10">
                <IncludesBand />
              </div>

              {/* billing behaviour notes */}
              <div className="mt-8 grid gap-x-10 gap-y-4 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-3">
                {NOTES.map(([label, note]) => (
                  <div key={label}>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-brand uppercase">
                      {label}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-snug text-fg-secondary">{note}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="mt-12 md:mt-16" aria-label="Loading plans">
      <div className="hidden md:block">
        <div className="grid grid-cols-[minmax(9rem,1.15fr)_repeat(4,minmax(0,1fr))] gap-x-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mt-3 h-11 rounded-md" />
        ))}
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export { PricingPage };
