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
}

export interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  inactiveLinks: number;
  totalScans: number;
  topLinks: TopLink[];
}

export type ScanDimension = string | null;

export interface ActivityItem {
  id: string;
  device: ScanDimension;
  browser: ScanDimension;
  os: ScanDimension;
  country: ScanDimension;
  city: ScanDimension;
  referrer: ScanDimension;
  utmSource: ScanDimension;
  utmMedium: ScanDimension;
  utmCampaign: ScanDimension;
  scannedAt: string;
  link: { name: string | null; shortId: string };
}

/**
 * Exact shape returned by the backend link mapper:
 * { id, name, targetUrl (UTM params already appended), shortId, isActive,
 *   expiresAt, createdAt, updatedAt, clicks }
 * NOTE: domainId / stored UTM fields / password-set flag are intentionally
 * NOT returned by the API and must not be invented client-side.
 */
export interface LinkItem {
  id: string;
  name: string | null;
  targetUrl: string;
  shortId: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  clicks: number;
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

export interface LinkAnalytics {
  totalClicks: number;
  browserStats: Array<{ browser: string | null; count: number }>;
  deviceStats: Array<{ device: string | null; count: number }>;
  countryStats: Array<{ country: string | null; count: number }>;
  osStats: Array<{ os: string | null; count: number }>;
  utmSource: Array<{ utmSource: string | null; count: number }>;
  utmMedium: Array<{ utmMedium: string | null; count: number }>;
  utmCampaign: Array<{ utmCampaign: string | null; count: number }>;
  utmTerm: Array<{ utmTerm: string | null; count: number }>;
  utmContent: Array<{ utmContent: string | null; count: number }>;
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
