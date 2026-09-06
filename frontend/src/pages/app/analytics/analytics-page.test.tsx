import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { getLink } from "@/api/links";
import { AnalyticsPage } from "./analytics-page";

const planState = vi.hoisted(() => ({ plan: "PRO" }));

vi.mock("@/auth/session", () => ({
  useSession: () => ({
    user: { plan: { name: planState.plan } },
  }),
}));

vi.mock("@/components/ui/toaster", () => ({
  useToaster: () => ({ toast: vi.fn() }),
}));

vi.mock("@/api/links", () => ({
  getLink: vi.fn(),
  listLinks: vi.fn().mockResolvedValue({
    success: true,
    data: [],
    pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
  }),
}));

const getStats = vi.fn();
const getActivity = vi.fn();
const getLinkAnalytics = vi.fn();
const getLinkCharts = vi.fn();

vi.mock("@/api/dashboard", () => ({
  getStats: (...args: unknown[]) => getStats(...args),
  getActivity: (...args: unknown[]) => getActivity(...args),
  getLinkAnalytics: (...args: unknown[]) => getLinkAnalytics(...args),
  getLinkCharts: (...args: unknown[]) => getLinkCharts(...args),
  exportLinkCsv: vi.fn(),
}));

/* shape mirrors what the backend actually returns per plan tier */
function emptyStats() {
  return {
    success: true,
    data: { totalLinks: 0, activeLinks: 0, inactiveLinks: 0, totalScans: 0, topLinks: [] },
  };
}

function proAnalyticsResponse() {
  return {
    success: true,
    analytics: {
      totalClicks: 10,
      deviceStats: [{ device: "Mobile", count: 10 }],
      countryStats: [{ country: "IN", count: 10 }],
      browserStats: [{ browser: "Chrome", count: 10 }],
      osStats: [{ os: "Android", count: 10 }],
      referrerStats: [{ referrer: null, count: 10 }],
      utmSource: [],
      utmMedium: [],
      utmCampaign: [],
      utmTerm: [],
      utmContent: [],
      hourlyStats: [{ hour: 14, count: 10 }],
      cityStats: [{ city: "Mumbai", count: 10 }],
      heatmapStats: [{ dow: 3, hour: 14, count: 10 }],
    },
  };
}

/* gated sections arrive stripped ([]) on lower plans — server does this */
function freeAnalyticsResponse() {
  return {
    success: true,
    analytics: {
      totalClicks: 10,
      deviceStats: [{ device: "Mobile", count: 10 }],
      countryStats: [{ country: "IN", count: 10 }],
      browserStats: [],
      osStats: [],
      referrerStats: [],
      utmSource: [],
      utmMedium: [],
      utmCampaign: [],
      utmTerm: [],
      utmContent: [],
      hourlyStats: [],
      cityStats: [],
      heatmapStats: [],
    },
  };
}

function chartsResponse() {
  return {
    success: true,
    data: {
      dailyStats: [{ day: "2026-01-01", clicks: 10 }],
      browserStats: [],
      countryStats: [],
      deviceStats: [],
      osStats: [],
      utmSourceStats: [],
      utmMediumStats: [],
      utmCampaignStats: [],
      utmTermStats: [],
      utmContentStats: [],
    },
  };
}

function renderPage(entry = "/app/analytics") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  planState.plan = "PRO";
});

describe("AnalyticsPage account view — activity feed", () => {
  it("renders real activity rows without crashing (regression: backend returns a flat { linkName, shortId } row, not a nested link object)", async () => {
    getStats.mockResolvedValue({
      success: true,
      data: { totalLinks: 1, activeLinks: 1, inactiveLinks: 0, totalScans: 3, topLinks: [] },
    });
    getActivity.mockResolvedValue({
      success: true,
      data: [
        {
          linkName: "Campaign X",
          shortId: "abc123",
          device: "Desktop",
          browser: "Chrome",
          country: "IN",
          scannedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Campaign X")).toBeInTheDocument();
    expect(screen.getByText("Desktop · Chrome · IN")).toBeInTheDocument();
  });

  it("shows the empty state when there is no activity yet, instead of crashing", async () => {
    getStats.mockResolvedValue(emptyStats());
    getActivity.mockResolvedValue({ success: true, data: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No scans yet.")).toBeInTheDocument();
    });
  });
});

describe("AnalyticsPage account view — peak hours gating", () => {
  it("FREE: shows the Starter upgrade slot instead of the hour chart", async () => {
    planState.plan = "FREE";
    getStats.mockResolvedValue(emptyStats());
    getActivity.mockResolvedValue({ success: true, data: [] });

    renderPage();

    expect(await screen.findAllByText(/Requires Starter/)).not.toHaveLength(0);
    expect(screen.getByText("Your current plan is Free.")).toBeInTheDocument();
  });

  it("STARTER+: renders the hour-of-day chart with real data", async () => {
    planState.plan = "STARTER";
    getStats.mockResolvedValue({
      success: true,
      data: {
        totalLinks: 1,
        activeLinks: 1,
        inactiveLinks: 0,
        totalScans: 11,
        topLinks: [],
        hourlyStats: [
          { hour: 9, count: 4 },
          { hour: 10, count: 7 },
        ],
      },
    });
    getActivity.mockResolvedValue({ success: true, data: [] });

    renderPage();

    expect(await screen.findByText(/peak 10:00 · 7/)).toBeInTheDocument();
    expect(screen.queryByText(/Requires Starter/)).not.toBeInTheDocument();
  });
});

describe("AnalyticsPage link workspace — viz + plan gating", () => {
  beforeEach(() => {
    vi.mocked(getLink).mockResolvedValue({
      success: true,
      data: {
        id: "abc",
        name: "Campaign",
        targetUrl: "https://example.com",
        shortId: "abc123",
        isActive: true,
        deepLink: false,
        appDeepLink: false,
        appScheme: null,
        androidPackage: null,
        appPath: null,
        iosStoreUrl: null,
        androidStoreUrl: null,
        expiresAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        clicks: 10,
        domainId: "dom-1",
        domainHost: "lnk.sh",
      },
    });
    getLinkCharts.mockResolvedValue(chartsResponse());
  });

  it("PRO: renders KPI grid, hour bars, cities, and the best-time heatmap", async () => {
    getLinkAnalytics.mockResolvedValue(proAnalyticsResponse());

    renderPage("/app/analytics?link=abc");

    /* derived + headline KPIs */
    expect(await screen.findByText("Total clicks")).toBeInTheDocument();
    expect(screen.getByText("Avg / day")).toBeInTheDocument();
    expect(screen.getByText("Best day")).toBeInTheDocument();
    expect(screen.getByText("Active days")).toBeInTheDocument();

    /* STARTER+ peak hours */
    expect(await screen.findByText(/peak 14:00 · 10/)).toBeInTheDocument();

    /* CREATOR+ cities */
    expect(screen.getByText("Cities")).toBeInTheDocument();
    expect(screen.getByText("Mumbai")).toBeInTheDocument();

    /* PRO heatmap — dow 3 is Wednesday */
    expect(screen.getByText("Best times")).toBeInTheDocument();
    expect(screen.getByText(/PEAK · Wednesday 14:00 UTC · 10 clicks/)).toBeInTheDocument();
  });

  it("FREE: shows locked slots for every gated viz and keeps the basic KPIs", async () => {
    planState.plan = "FREE";
    getLinkAnalytics.mockResolvedValue(freeAnalyticsResponse());

    renderPage("/app/analytics?link=abc");

    expect(await screen.findByText("Total clicks")).toBeInTheDocument();
    expect(screen.getByText("Avg / day")).toBeInTheDocument();

    /* Peak hours + Clients both gate on Starter */
    await waitFor(() => {
      expect(screen.getAllByText(/Requires Starter/)).toHaveLength(2);
    });
    /* Traffic sources (cities/referrers/UTM) gates on Creator */
    expect(screen.getByText("City-level, referrer, and UTM campaign breakdowns.")).toBeInTheDocument();
    expect(screen.getByText(/Requires Creator/)).toBeInTheDocument();
    /* Best-time heatmap gates on Pro */
    expect(screen.getByText(/Requires Pro/)).toBeInTheDocument();

    /* no gated chart content leaks through (locked slots keep their titles) */
    expect(screen.queryByText("Cities")).not.toBeInTheDocument();
    expect(screen.queryByText("Mon")).not.toBeInTheDocument();
    expect(screen.queryByText("Browsers")).not.toBeInTheDocument();
  });

  it("STARTER: unlocks hour bars and clients, keeps creator/pro sections locked", async () => {
    planState.plan = "STARTER";
    getLinkAnalytics.mockResolvedValue({
      ...freeAnalyticsResponse(),
      analytics: {
        ...freeAnalyticsResponse().analytics,
        browserStats: [{ browser: "Chrome", count: 10 }],
        osStats: [{ os: "Android", count: 10 }],
        hourlyStats: [{ hour: 14, count: 10 }],
      },
    });

    renderPage("/app/analytics?link=abc");

    expect(await screen.findByText(/peak 14:00 · 10/)).toBeInTheDocument();
    expect(screen.getByText("Browsers")).toBeInTheDocument();
    expect(screen.getByText(/Requires Creator/)).toBeInTheDocument();
    expect(screen.getByText(/Requires Pro/)).toBeInTheDocument();
    expect(screen.queryByText("Cities")).not.toBeInTheDocument();
  });
});
