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
  
  domainHost?: string;
}

export interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  inactiveLinks: number;
  totalScans: number;
  topLinks: TopLink[];
  
  dailyStats?: DailyPoint[];
  
  hourlyStats?: HourPoint[];
}


export interface ActivityItem {
  linkName: string;
  shortId: string;
  device: string;
  browser: string;
  country: string;
  scannedAt: string;
}


export interface LinkItem {
  id: string;
  name: string | null;
  targetUrl: string;
  shortId: string;
  isActive: boolean;
  
  deepLink: boolean;
  
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



export interface DailyPoint {
  day: string;
  clicks: number;
}

export interface HourPoint {
  hour: number;
  count: number;
}

export interface HeatPoint {
  
  dow: number;
  hour: number;
  count: number;
}


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
