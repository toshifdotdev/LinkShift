import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const previewRedirect = vi.fn();
vi.mock("@/api/redirect-tester", async (orig) => {
  const actual = await orig<typeof import("@/api/redirect-tester")>();
  return { ...actual, previewRedirect: (...a: unknown[]) => previewRedirect(...a) };
});

import { RedirectTesterPage } from "./redirect-tester-page";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RedirectTesterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const before = { url: "https://example.com/base", kind: "redirect" as const, preset: "desktop" as const, audience: "desktop" as const, showsInterstitial: false, appUrl: null, storeUrl: null, deepLinkApplied: false, appLinkApplied: false, appDeepLinkApplied: false, steps: [{ label: "Destination", detail: "https://example.com/base" }], warnings: [] };

beforeEach(() => {
  previewRedirect.mockReset().mockResolvedValue(before);
});

afterEach(() => vi.restoreAllMocks());

describe("redirect tester page", () => {
  it("does not preview until a destination is supplied", async () => {
    renderPage();

    expect(screen.getByRole("button", { name: /run preview/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /run preview/i }));

    expect(previewRedirect).not.toHaveBeenCalled();
  });

  it("previews the destination the user typed", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/destination url/i), { target: { value: "https://example.com/base" } });
    fireEvent.click(screen.getByRole("button", { name: /run preview/i }));

    await waitFor(() => expect(previewRedirect).toHaveBeenCalled());
    expect(previewRedirect.mock.calls[0][0]).toMatchObject({
      url: "https://example.com/base",
    });
  });

  it("shows the resolved destination and an explanation", async () => {
    previewRedirect.mockResolvedValue({
      ...before,
      finalUrl: "https://example.com/base/checkout",
      audience: "ios",
      showsInterstitial: true,
      appUrl: "myapp://checkout",
      storeUrl: "https://apps.apple.com/app/id1",
      steps: [
        { label: "Destination", detail: "https://example.com/base" },
        { label: "Path forwarding", detail: '"checkout" is appended.' },
      ],
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/destination url/i), { target: { value: "https://example.com/base" } });
    fireEvent.click(screen.getByRole("button", { name: /run preview/i }));

    expect(await screen.findByText("https://example.com/base/checkout")).toBeInTheDocument();
    expect(screen.getByText("myapp://checkout")).toBeInTheDocument();
    expect(screen.getByText("iOS visitor")).toBeInTheDocument();
    // Scoped to the explanation list: the input panel also carries a
    // "Path forwarding" label, so a page-wide query is ambiguous.
    expect(screen.getByText('"checkout" is appended.')).toBeInTheDocument();
  });

  it("surfaces warnings instead of hiding a dropped feature", async () => {
    previewRedirect.mockResolvedValue({
      ...before,
      warnings: ["App deep links are not included in your plan."],
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/destination url/i), { target: { value: "https://example.com/base" } });
    fireEvent.click(screen.getByRole("button", { name: /run preview/i }));

    expect(await screen.findByText(/not included in your plan/i)).toBeInTheDocument();
  });

  it("states that previews cost nothing", async () => {
    renderPage();
    expect(screen.getByText(/never counts against your redirect limit/i)).toBeInTheDocument();
  });
});
