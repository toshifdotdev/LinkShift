import { apiFetch, ApiError } from "./client";

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

export function cancelSubscription(cancelAtPeriodEnd: boolean) {
  return apiFetch<{ success: true; result: { localStatus: string; cancelAtPeriodEnd: boolean } }>(
    "/billing/cancel",
    { method: "POST", body: { cancelAtPeriodEnd } },
  );
}

export function changePlan(plan: PlanName, billingCycle: BillingCycle) {
  return apiFetch<{
    success: true;
    result: {
      changeType: "UPGRADE" | "DOWNGRADE" | "SWITCH_TO_MONTHLY" | "SWITCH_TO_YEARLY" | "NO_CHANGE";
      scheduleChangeAt: string | null;
      appliedImmediately: boolean;
    };
  }>("/billing/change-plan", { method: "POST", body: { plan, billingCycle } });
}

export interface BillingUsage {
  periodStart: string;
  links: { used: number; cap: number | null };
  customSlugs: { used: number; cap: number | null };
  destinationEdits: { used: number; cap: number | null };
  redirects: { used: number; cap: number | null };
  qrCodes: { used: number; cap: number | null };
  domains: { used: number; cap: number | null };
  analyticsDays: number;
}

const USAGE_CATEGORIES = [
  "links",
  "customSlugs",
  "destinationEdits",
  "redirects",
  "qrCodes",
  "domains",
] as const;

/**
 * GET /billing/usage — every category and cap the page renders. The response
 * is validated here (not scattered through the page) so a stale/malformed
 * backend contract surfaces as a recoverable query error instead of a
 * `Cannot read properties of undefined` render crash (blank page).
 */
export async function getBillingUsage() {
  const res = await apiFetch<{ success: true; data: Partial<BillingUsage> }>("/billing/usage");
  const data = res.data;
  if (!data || typeof data.periodStart !== "string" || typeof data.analyticsDays !== "number") {
    throw new ApiError(502, "Billing usage data is invalid. Please try again.");
  }
  for (const key of USAGE_CATEGORIES) {
    const cat = data[key];
    if (!cat || typeof cat.used !== "number" || (cat.cap !== null && typeof cat.cap !== "number")) {
      throw new ApiError(502, `Billing usage data is incomplete (${key}). Please try again.`);
    }
  }
  return res as { success: true; data: BillingUsage };
}
