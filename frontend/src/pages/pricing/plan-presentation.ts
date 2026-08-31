import type { ApiPlan, Currency } from "@/api/billing";

/**
 * The FREE tier is defined by the backend seed (prisma/seed.ts). It is the
 * default state of every account and is intentionally presented alongside
 * the API-provided paid plans.
 */
export const FREE_PLAN: ApiPlan = {
  name: "FREE",
  monthlyPrice: 0,
  yearlyPrice: 0,
  currency: "INR",
  maxLinks: 50,
  maxQrPerMonth: 10,
  maxDomains: 0,
  maxRedirectsPerMonth: 2500,
  analyticsDays: 30,
  maxCustomSlugsPerMonth: 0,
  maxDestinationChangesPerMonth: 3,
};

export const PLAN_AUDIENCE: Record<string, string> = {
  FREE: "For trying LinkShift out",
  STARTER: "For freelancers and students",
  CREATOR: "For creators and small teams",
  PRO: "For businesses at scale",
};

export function currencySymbol(currency: Currency): string {
  return currency === "INR" ? "₹" : "$";
}

export function formatPrice(amount: number, currency: Currency): string {
  return amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US");
}

export function formatLimit(value: number | null): string {
  if (value === null) return "Unlimited";
  if (value === 0) return "—";
  return value.toLocaleString("en-US");
}

export function formatAnalytics(days: number): string {
  if (days >= 365) {
    const years = days / 365;
    return `${Number.isInteger(years) ? years : years.toFixed(1)} yr${years > 1 ? "s" : ""}`;
  }
  if (days >= 30 && days % 30 === 0) {
    return `${days / 30} mo`;
  }
  return `${days} days`;
}

/**
 * Per-plan display overrides. Used where enforcement code differs from raw
 * seed numbers — e.g. FREE accounts are hard-blocked from destination edits
 * by the subscription requirement (billing.service checkDestinationLimit),
 * so their seeded quota of 3 must never be advertised.
 */
const OVERRIDES: Record<string, Record<string, string>> = {
  FREE: { destinationEdits: "—", customSlugs: "—" },
};

export interface LimitRow {
  key: string;
  label: string;
  value: (plan: ApiPlan) => string;
}

export const LIMIT_ROWS: LimitRow[] = [
  { key: "links", label: "Short links", value: (p) => formatLimit(p.maxLinks) },
  { key: "redirects", label: "Redirects / mo", value: (p) => formatLimit(p.maxRedirectsPerMonth) },
  { key: "qr", label: "QR codes / mo", value: (p) => formatLimit(p.maxQrPerMonth) },
  { key: "domains", label: "Custom domains", value: (p) => formatLimit(p.maxDomains) },
  {
    key: "customSlugs",
    label: "Custom slugs / mo",
    value: (p) => OVERRIDES[p.name]?.customSlugs ?? formatLimit(p.maxCustomSlugsPerMonth),
  },
  {
    key: "destinationEdits",
    label: "Destination edits / mo",
    value: (p) =>
      OVERRIDES[p.name]?.destinationEdits ?? formatLimit(p.maxDestinationChangesPerMonth),
  },
  { key: "analytics", label: "Analytics history", value: (p) => formatAnalytics(p.analyticsDays) },
];

/** Feature gates enforced in backend code (billing.service hardcoded checks). */
export type FlagValue = boolean;

export interface FlagRow {
  label: string;
  note?: string;
  values: Record<string, FlagValue>;
}

export const FLAG_ROWS: FlagRow[] = [
  {
    label: "UTM campaign builder",
    note: "Source · medium · campaign tracking on every scan",
    values: { FREE: false, STARTER: false, CREATOR: true, PRO: true },
  },
  {
    label: "CSV analytics export",
    note: "Full click ledger, streamed per link",
    values: { FREE: false, STARTER: false, CREATOR: true, PRO: true },
  },
  {
    label: "Deep linking",
    note: "Forward appended paths & queries to your destination",
    values: { FREE: false, STARTER: false, CREATOR: false, PRO: true },
  },
];

/** Implemented for every plan without any gate. */
export const UNIVERSAL_INCLUDES: Array<{ title: string; note: string }> = [
  { title: "Password-protected links", note: "bcrypt-guarded unlock endpoint" },
  { title: "Link expiration", note: "Hard 410 after the set datetime" },
  { title: "Full QR studio", note: "Colors, patterns, eye styles & logos" },
  { title: "Redirect grace band", note: "Soft overage before a plan cuts off" },
];

/** Yearly discount vs 12×monthly, derived from live plan data. */
export function yearlyDiscountPercent(plans: ApiPlan[]): number | null {
  const base = plans.find((p) => p.yearlyPrice !== null && p.monthlyPrice);
  if (!base?.yearlyPrice || !base.monthlyPrice) return null;
  const full = base.monthlyPrice * 12;
  if (full <= 0) return null;
  return Math.round((1 - base.yearlyPrice / full) * 100);
}
