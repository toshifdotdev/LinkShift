import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LinkActionsMenu } from "./link-actions-menu";
import type { LinkItem } from "@/types/api";

// The toasts themselves are another component's business; stubbing the provider
// also keeps framer-motion out of this render.
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/components/ui/toaster", () => ({ useToaster: () => ({ toast }) }));

// Spy on navigation without stubbing the rest of the router: the menu only ever
// reaches for useNavigate, and these tests assert on the URLs it hands it.
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

function linkWith(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "link-1",
    name: "Spring campaign",
    targetUrl: "https://example.com/shop?utm_source=instagram&utm_medium=social",
    shortId: "spring",
    isActive: true,
    deepLink: true,
    appDeepLink: false,
    appScheme: null,
    androidPackage: null,
    appPath: null,
    iosStoreUrl: null,
    androidStoreUrl: null,
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    clicks: 12,
    domainId: "default",
    domainHost: "go.linkshift.in",
    utmSource: "instagram",
    utmMedium: "social",
    utmCampaign: "spring",
    utmTerm: null,
    utmContent: null,
    ...overrides,
  };
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

function renderMenu(link: LinkItem) {
  return render(
    <MemoryRouter>
      <LinkActionsMenu link={link} onEdit={vi.fn()} onDelete={vi.fn()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  toast.mockClear();
  navigate.mockClear();
});

// Copying a link that has campaign tags and path forwarding switched on must
// still hand out the bare canonical URL: tags are appended to the destination by
// the server, and a forwarded path is something the visitor adds afterwards.
describe("LinkActionsMenu copy short link", () => {
  it("copies the clean canonical URL, with no campaign tags and no path", async () => {
    const writeText = stubClipboard();
    renderMenu(linkWith());

    fireEvent.click(screen.getByRole("button", { name: "Copy short link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://go.linkshift.in/spring"));
    expect(writeText.mock.calls[0][0]).not.toContain("utm_");
  });

  it("copies the owner's own domain, still with nothing appended", async () => {
    const writeText = stubClipboard();
    renderMenu(linkWith({ domainHost: "links.acme.com" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy short link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://links.acme.com/spring"));
  });

  it("confirms with a toast naming the host and slug only", async () => {
    stubClipboard();
    renderMenu(linkWith());

    fireEvent.click(screen.getByRole("button", { name: "Copy short link" }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls[0][0]).toMatchObject({
      title: "Copied",
      meta: "go.linkshift.in/spring",
    });
  });
});

/* The dashboard is shared, screenshotted and bookmarked, so the URL it lands on
   must read like the product: the slug a link is known by, never the CUID the
   database happens to use. Analytics and QR Studio both speak id internally and
   resolve the slug themselves. */
describe("LinkActionsMenu navigation", () => {
  const DATABASE_ID = "cmtgueyrjf36se2e92rdqumpb";

  function renderedLink() {
    return linkWith({ id: DATABASE_ID, name: "IG promo", shortId: "igpromo" });
  }

  async function openMenu() {
    fireEvent.click(screen.getByRole("button", { name: "Actions for IG promo" }));
    return screen.findByRole("menuitem", { name: "Analytics" });
  }

  it("sends Analytics to the slug, not the database id", async () => {
    renderMenu(renderedLink());
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Analytics" }));

    expect(navigate).toHaveBeenCalledWith("/app/analytics?link=igpromo");
  });

  it("sends QR code to the slug, not the database id", async () => {
    renderMenu(renderedLink());
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "QR code" }));

    expect(navigate).toHaveBeenCalledWith("/app/qr?link=igpromo");
  });

  it("leaves no CUID anywhere in the URLs it builds", async () => {
    renderMenu(renderedLink());

    /* selecting an item closes the menu, so each action starts by reopening it */
    await openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Analytics" }));

    await openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "QR code" }));

    expect(navigate).toHaveBeenCalledTimes(2);
    for (const [url] of navigate.mock.calls) {
      expect(url).not.toContain(DATABASE_ID);
      expect(url).toContain("link=igpromo");
    }
  });
});
