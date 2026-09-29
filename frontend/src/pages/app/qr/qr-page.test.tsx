import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { LinkItem, LinksPagination } from "@/types/api";

type ObserverEntry = { isIntersecting: boolean };
type ObserverCallback = (entries: ObserverEntry[]) => void;

type StudioProps = {
  open: boolean;
  initialLinkId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const { listLinksMock, fetchQrImageMock, observers, studioProps } = vi.hoisted(() => ({
  listLinksMock: vi.fn(),
  fetchQrImageMock: vi.fn(),
  observers: [] as Array<{ callback: ObserverCallback; observed: Element[] }>,
  studioProps: { latest: null as StudioProps | null },
}));

vi.mock("@/api/links", () => ({ listLinks: listLinksMock }));
vi.mock("@/api/qr", () => ({ fetchQrImage: fetchQrImageMock, downloadQrImage: vi.fn() }));
vi.mock("@/api/token", () => ({ getAccessToken: () => "test-token" }));
vi.mock("@/components/ui/toaster", () => ({ useToaster: () => ({ toast: vi.fn() }) }));
/* What the page owes the studio is a props pair — open, and which link to
   preselect — so the double records them instead of rendering its internals. */
vi.mock("./qr-studio", () => ({
  QrStudio: (props: StudioProps) => {
    studioProps.latest = props;
    return null;
  },
}));

import { QrPage } from "./qr-page";

function makeLink(id: string, name: string, shortId = `short${id}`, domainHost = "go.linkshift.in"): LinkItem {
  return {
    id,
    name,
    targetUrl: "https://example.com",
    shortId,
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
    domainHost,
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

function renderPage(entry = "/app/qr") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
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
  studioProps.latest = null;
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

/*
 * A link's action menu has nowhere to send the user but this page, and the
 * address bar only ever carries a slug — which is not what QR Studio selects on,
 * so the page has to translate the reference before the studio can open on it.
 */
describe("QrPage — opening the studio from ?link=", () => {
  const DATABASE_ID = "cmtgueyrjf36se2e92rdqumpb";

  const shelf = () => [
    makeLink(DATABASE_ID, "IG promo", "igpromo"),
    makeLink("l2", "Launch page", "launch", "nadeem.io"),
  ];

  /*
   * One double serves both callers. The gallery asks for a sorted page; the
   * reference resolver asks for a plain search, which the backend runs over
   * name, destination and slug alike. The shape of the call decides the answer.
   */
  function serve(rows: LinkItem[]) {
    listLinksMock.mockImplementation((params: { search?: string; sort?: string }) =>
      Promise.resolve(
        params.sort
          ? page(rows, 1, false, rows.length)
          : page(
              rows.filter((l) => l.shortId === params.search || l.id === params.search),
              1,
              false,
              1,
            ),
      ),
    );
  }

  /*
   * react-query carries on in microtasks once a request settles, so a macrotask
   * turn puts every resulting state update on record before a test asks a
   * question about it — the "it stayed shut" assertions must not pass on timing.
   */
  async function settled() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
    });
  }

  it("opens the studio with the slug's link already selected", async () => {
    serve(shelf());

    renderPage("/app/qr?link=igpromo");

    await waitFor(() => expect(studioProps.latest).toMatchObject({ open: true, initialLinkId: DATABASE_ID }));
    /* the slug travelled through the shared resolver: a list search for it */
    expect(listLinksMock).toHaveBeenCalledWith(expect.objectContaining({ search: "igpromo" }), expect.anything());
  });

  it("still opens it for a bookmark that carries the old database id", async () => {
    serve(shelf());

    renderPage(`/app/qr?link=${DATABASE_ID}`);

    await waitFor(() => expect(studioProps.latest).toMatchObject({ open: true, initialLinkId: DATABASE_ID }));
  });

  it("hands over the link, not the reference, so the studio's own rules apply", async () => {
    serve(shelf());

    renderPage("/app/qr?link=launch");

    await waitFor(() => expect(studioProps.latest).toMatchObject({ open: true, initialLinkId: "l2" }));
    /* the gallery keeps showing that code on the domain the link actually uses */
    expect(screen.getByText("nadeem.io/")).toBeInTheDocument();
  });

  it("asks for nothing and opens nothing when there is no parameter", async () => {
    serve(shelf());

    renderPage();

    expect(await screen.findByText("IG promo")).toBeInTheDocument();
    await settled();

    expect(studioProps.latest).toMatchObject({ open: false, initialLinkId: null });
    const searched = listLinksMock.mock.calls.map(([params]) => (params as { search?: string }).search);
    expect(searched.filter(Boolean)).toEqual([]);
  });

  it("leaves the page exactly as it was when the reference matches no link", async () => {
    serve(shelf());

    renderPage("/app/qr?link=ghostslug");

    await waitFor(() =>
      expect(listLinksMock).toHaveBeenCalledWith(expect.objectContaining({ search: "ghostslug" }), expect.anything()),
    );
    await settled();

    expect(studioProps.latest).toMatchObject({ open: false });
    expect(screen.getByText("IG promo")).toBeInTheDocument();
    expect(screen.getByText("Launch page")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your QR library")).not.toBeInTheDocument();
  });

  it("stays closed once dismissed, even with the parameter still in the address bar", async () => {
    serve(shelf());

    renderPage("/app/qr?link=igpromo");
    await waitFor(() => expect(studioProps.latest).toMatchObject({ open: true, initialLinkId: DATABASE_ID }));

    const studio = studioProps.latest!;
    await act(async () => {
      studio.onOpenChange(false);
    });
    await settled();

    expect(studioProps.latest).toMatchObject({ open: false });
  });
});

