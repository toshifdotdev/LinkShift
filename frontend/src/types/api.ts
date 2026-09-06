export type SubscriptionStatus =
  | "AUTHORIZATION_PENDING"
  | "ACTIVE"
  | "PAYMENT_RETRY"
  | "HALTED"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";
export type BillingCycle = "MONTHLY" | "YEARLY";

export interface MeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: "LOCAL" | "GOOGLE";
  verified: boolean;
  createdAt: string;
  hasPassword: boolean;
  plan: { name: string };
  subscription: {
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface LoginResponse {
  success: true;
  message: string;
  user: AuthUser;
  accessToken: string;
}

export interface RefreshResponse {
  success: true;
  accessToken: string;
}

export interface TopLink {
  id: string;
  name: string | null;
  shortId: string;
  clicks: number;
  /** Host the link lives on; older cached payloads may omit it. */
  domainHost?: string;
}

export interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  inactiveLinks: number;
  totalScans: number;
  topLinks: TopLink[];
  /** Account-level clicks per day; omitted by older cached payloads. */
  dailyStats?: DailyPoint[];
  /** Account-level clicks per hour-of-day (UTC); STARTER+ only. */
  hourlyStats?: HourPoint[];
}

/**
 * Exact shape returned by the backend activity mapper (dashboard.mapper.ts
 * analyticsMapper): a flat row per scan — there is no nested `link` object
 * and no `id`/`os`/`city`/`referrer`/`utm*` fields, despite what an older
 * version of this type implied.
 */
export interface ActivityItem {
  linkName: string;
  shortId: string;
  device: string;
  browser: string;
  country: string;
  scannedAt: string;
}

/**
 * Exact shape returned by the backend link mapper:
 * { id, name, targetUrl (UTM params already appended), shortId, isActive,
 *   deepLink, appDeepLink, appScheme, androidPackage, appPath, iosStoreUrl,
 *   androidStoreUrl, expiresAt, createdAt, updatedAt, clicks, domainId,
 *   domainHost }
 * `domainHost` is the host the link actually lives on (the shared default
 * domain or a connected custom domain) — use it to render the short URL.
 * NOTE: stored UTM fields / password-set flag are intentionally NOT returned
 * by the API and must not be invented client-side.
 */
export interface LinkItem {
  id: string;
  name: string | null;
  targetUrl: string;
  shortId: string;
  isActive: boolean;
  /** Path forwarding: forward appended paths/queries to the destination. */
  deepLink: boolean;
  /** Mobile app deep linking: open the configured app on mobile. */
  appDeepLink: boolean;
  appScheme: string | null;
  androidPackage: string | null;
  appPath: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  clicks: number;
  domainId: string;
  domainHost: string;
}

export interface LinksPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DomainRow {
  id: string;
  host: string;
  verified: boolean;
  verifiedAt: string | null;
  isDefault: boolean;
  userId: string | null;
  createdAt: string;
}

export interface DomainInstructions {
  type: "CNAME";
  host: string;
  target: string;
}

export interface QrResponse {
  id: string;
  imageUrl: string;
  imagePublicId: string;
  shortId: string;
  foregroundColor: string;
  backgroundColor: string;
  margin: number | null;
  pattern: "square" | "dots" | "rounded" | "extraRounded" | "classy" | "classyRounded";
  eyeStyle: "square" | "dot" | "extraRounded";
  eyeBallStyle: "square" | "dot";
  frame: "none" | "clean" | "double" | "accent" | "label" | "branded";
  logoUrl: string | null;
  logoPublicId: string | null;
}

export const ANALYTICS_DAYS = [7, 30, 60, 90, 180, 365, 730, 1095] as const;
export type AnalyticsDays = (typeof ANALYTICS_DAYS)[number];

/* ---- Analytics (per-link; account level exposes stats/activity only) ---- */

export interface DailyPoint {
  day: string;
  clicks: number;
}

export interface HourPoint {
  hour: number;
  count: number;
}

export interface HeatPoint {
  /** Postgres DOW: 0 = Sunday … 6 = Saturday (UTC). */
  dow: number;
  hour: number;
  count: number;
}

/**
 * Exact shape returned by the backend getAnalytics mapper. Gated sections
 * are stripped server-side by plan tier (browsers/OS and peak hours from
 * STARTER, cities and UTM/referrers from CREATOR, the best-time heatmap
 * from PRO) and arrive as empty arrays when locked.
 */
export interface LinkAnalytics {
  totalClicks: number;
  browserStats: Array<{ browser: string; count: number }>;
  deviceStats: Array<{ device: string; count: number }>;
  countryStats: Array<{ country: string; count: number }>;
  osStats: Array<{ os: string; count: number }>;
  referrerStats: Array<{ referrer: string | null; count: number }>;
  utmSource: Array<{ utmSource: string | null; count: number }>;
  utmMedium: Array<{ utmMedium: string | null; count: number }>;
  utmCampaign: Array<{ utmCampaign: string | null; count: number }>;
  utmTerm: Array<{ utmTerm: string | null; count: number }>;
  utmContent: Array<{ utmContent: string | null; count: number }>;
  hourlyStats: HourPoint[];
  cityStats: Array<{ city: string; count: number }>;
  heatmapStats: HeatPoint[];
}

export interface LinkCharts {
  browserStats: Array<{ browser: string | null; count: number }>;
  countryStats: Array<{ country: string | null; count: number }>;
  deviceStats: Array<{ device: string | null; count: number }>;
  osStats: Array<{ os: string | null; count: number }>;
  dailyStats: DailyPoint[];
  utmSourceStats: Array<{ utmSource: string | null; count: number }>;
  utmMediumStats: Array<{ utmMedium: string | null; count: number }>;
  utmCampaignStats: Array<{ utmCampaign: string | null; count: number }>;
  utmTermStats: Array<{ utmTerm: string | null; count: number }>;
  utmContentStats: Array<{ utmContent: string | null; count: number }>;
}
