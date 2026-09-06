import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { LinkItem, LinksPagination } from "@/types/api";

type ObserverEntry = { isIntersecting: boolean };
type ObserverCallback = (entries: ObserverEntry[]) => void;

const { listLinksMock, fetchQrImageMock, observers } = vi.hoisted(() => ({
  listLinksMock: vi.fn(),
  fetchQrImageMock: vi.fn(),
  observers: [] as Array<{ callback: ObserverCallback; observed: Element[] }>,
}));

vi.mock("@/api/links", () => ({ listLinks: listLinksMock }));
vi.mock("@/api/qr", () => ({ fetchQrImage: fetchQrImageMock, downloadQrImage: vi.fn() }));
vi.mock("@/api/token", () => ({ getAccessToken: () => "test-token" }));
vi.mock("@/components/ui/toaster", () => ({ useToaster: () => ({ toast: vi.fn() }) }));
vi.mock("./qr-studio", () => ({ QrStudio: () => null }));

import { QrPage } from "./qr-page";

function makeLink(id: string, name: string): LinkItem {
  return {
    id,
    name,
    targetUrl: "https://example.com",
    shortId: `short${id}`,
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
    clicks: 0,
    domainId: "d1",
    domainHost: "go.linkshift.in",
  };
}

function page(data: LinkItem[], page: number, hasNextPage: boolean, totalRecords: number) {
  const pagination: LinksPagination = {
    page,
    limit: 50,
    totalRecords,
    totalPages: Math.ceil(totalRecords / 50),
    hasNextPage,
    hasPreviousPage: page > 1,
  };
  return { success: true as const, data, pagination };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/qr"]}>
        <QrPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastObserver() {
  return observers[observers.length - 1];
}

async function triggerIntersection() {
  const observer = lastObserver();
  expect(observer).toBeDefined();
  await act(async () => {
    observer.callback([{ isIntersecting: true }]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  observers.length = 0;
  class FakeIntersectionObserver {
    callback: ObserverCallback;
    observed: Element[] = [];
    constructor(callback: ObserverCallback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(el: Element) {
      this.observed.push(el);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  fetchQrImageMock.mockResolvedValue({ url: "blob:fake-qr" });
});

describe("QrPage gallery — infinite loading (regression: 100-item hard cap)", () => {
  it("loads the first page at limit 50 and shows the account-wide total", async () => {
    listLinksMock.mockResolvedValue(page([makeLink("l1", "Spring campaign"), makeLink("l2", "Launch page")], 1, true, 120));

    renderPage();

    expect(await screen.findByText("Spring campaign")).toBeInTheDocument();
    expect(screen.getByText("Launch page")).toBeInTheDocument();
    expect(screen.getByText("120 links")).toBeInTheDocument();

    expect(listLinksMock).toHaveBeenCalledTimes(1);
    expect(listLinksMock.mock.calls[0][0]).toMatchObject({ page: 1, limit: 50 });
    expect(screen.getByText("Scroll to load more")).toBeInTheDocument();
  });

  it("fetches and appends the next page when the sentinel scrolls into view", async () => {
    listLinksMock.mockImplementation(({ page: p }: { page: number }) =>
      Promise.resolve(
        p === 1
          ? page([makeLink("l1", "Alpha link"), makeLink("l2", "Beta link")], 1, true, 120)
          : page([makeLink("l3", "Gamma link")], 2, false, 120),
      ),
    );

    renderPage();

    await screen.findByText("Alpha link");

    await triggerIntersection();

    await screen.findByText("Gamma link");
    expect(screen.getByText("Alpha link")).toBeInTheDocument();
    expect(listLinksMock).toHaveBeenCalledTimes(2);
    expect(listLinksMock.mock.calls[1][0]).toMatchObject({ page: 2, limit: 50 });

    await waitFor(() => {
      expect(screen.queryByText("Scroll to load more")).not.toBeInTheDocument();
    });
  });

  it("keeps loaded rows and offers a retry when a later page fails", async () => {
    listLinksMock.mockImplementation(({ page: p }: { page: number }) =>
      p === 1
        ? Promise.resolve(page([makeLink("l1", "Alpha link")], 1, true, 120))
        : Promise.reject(new Error("Page two exploded")),
    );

    renderPage();

    await screen.findByText("Alpha link");
    await triggerIntersection();

    expect(await screen.findByText("Couldn't load more links.")).toBeInTheDocument();
    expect(screen.getByText("Alpha link")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your QR library")).not.toBeInTheDocument();
  });

  it("shows the full error state only when the first page fails", async () => {
    listLinksMock.mockRejectedValue(new Error("Library is down"));

    renderPage();

    expect(await screen.findByText("Couldn't load your QR library")).toBeInTheDocument();
    expect(screen.getByText("Library is down")).toBeInTheDocument();
  });

  it("shows the empty state for an account with no links", async () => {
    listLinksMock.mockResolvedValue(page([], 1, false, 0));

    renderPage();

    expect(await screen.findByText("No links to decorate yet")).toBeInTheDocument();
    expect(screen.queryByText("Scroll to load more")).not.toBeInTheDocument();
  });
});
