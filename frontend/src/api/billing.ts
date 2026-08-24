import { apiFetch } from "./client";

export type PlanName = "STARTER" | "CREATOR" | "PRO";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type Currency = "INR" | "USD";

/** Shape returned by GET /billing/plans (server maps Prisma Plan → these fields). */
export interface ApiPlan {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: Currency;
  maxLinks: number | null;
  maxQrPerMonth: number | null;
  maxDomains: number | null;
  maxRedirectsPerMonth: number | null;
  analyticsDays: number;
  maxCustomSlugsPerMonth: number | null;
  maxDestinationChangesPerMonth: number | null;
}

export interface PlansResponse {
  success: true;
  currency: Currency;
  plans: ApiPlan[];
}

export interface SubscribeResult {
  subscriptionId: string;
  providerSubscriptionId: string;
  planId: string;
  billingCycle: BillingCycle;
  currency: Currency;
  shortUrl?: string;
  keyId: string;
}

export interface VerifyResult {
  subscriptionId: string;
  providerSubscriptionId: string;
  verified: boolean;
  status: string;
  providerStatus: string | null;
}

export type SubscriptionStatus =
  | "AUTHORIZATION_PENDING"
  | "ACTIVE"
  | "PAYMENT_RETRY"
  | "HALTED"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

/** GET /billing/subscription returns the Prisma row incl. plan & pendingPlan. */
export interface ApiSubscription {
  id: string;
  status: SubscriptionStatus;
  currency: Currency;
  billingCycle: BillingCycle;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  changeScheduledAt: string | null;
  providerSubscriptionId: string | null;
  plan: { id: string; name: string } & Record<string, unknown>;
  pendingPlan: { id: string; name: string } & Record<string, unknown> | null;
}

export async function getPlans(signal?: AbortSignal) {
  return apiFetch<PlansResponse>("/billing/plans", { signal });
}

export async function getSubscription() {
  return apiFetch<{ success: true; subscription: ApiSubscription | null }>(
    "/billing/subscription",
  );
}

export function subscribe(plan: PlanName, billingCycle: BillingCycle) {
  return apiFetch<{ success: true; result: SubscribeResult }>("/billing/subscribe", {
    method: "POST",
    body: { plan, billingCycle },
  });
}

export function verifySubscription(payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{ success: true; result: VerifyResult }>("/billing/subscribe/verify", {
    method: "POST",
    body: payload,
  });
}
