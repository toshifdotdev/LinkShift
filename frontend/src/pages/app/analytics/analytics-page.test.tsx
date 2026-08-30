import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsPage } from "./analytics-page";

vi.mock("@/auth/session", () => ({
  useSession: () => ({
    user: { plan: { name: "PRO" } },
  }),
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

vi.mock("@/api/dashboard", () => ({
  getStats: (...args: unknown[]) => getStats(...args),
  getActivity: (...args: unknown[]) => getActivity(...args),
  getLinkAnalytics: vi.fn(),
  getLinkCharts: vi.fn(),
  exportLinkCsv: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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
    getStats.mockResolvedValue({
      success: true,
      data: { totalLinks: 0, activeLinks: 0, inactiveLinks: 0, totalScans: 0, topLinks: [] },
    });
    getActivity.mockResolvedValue({ success: true, data: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No scans yet.")).toBeInTheDocument();
    });
  });
});
