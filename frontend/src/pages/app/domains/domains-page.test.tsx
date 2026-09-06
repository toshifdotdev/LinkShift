import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { DomainRow } from "@/types/api";

// Pins the custom-domain allowance display on the Domains page: the seeded
// plan caps are FREE 0 / STARTER 1 / CREATOR 5 / PRO unlimited (mirroring
// Plan.maxDomains), the shared go.linkshift.in default is never counted as
// the account's own usage, and a zero-domain plan never shows the at-cap
// banner — it speaks through its dedicated empty state.
const testState = vi.hoisted(() => ({
  plan: "FREE",
  rows: [] as DomainRow[],
}));

vi.mock("@/auth/session", () => ({
  useSession: () => ({ user: { plan: { name: testState.plan } } }),
}));
vi.mock("@/hooks/use-domains", () => ({
  useDomains: () => ({
    data: testState.rows,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/api/domains", () => ({
  addDomain: vi.fn(),
  deleteDomain: vi.fn(),
  verifyDomain: vi.fn(),
}));
vi.mock("@/components/ui/toaster", () => ({
  useToaster: () => ({ toast: vi.fn() }),
}));

import { DomainsPage } from "./domains-page";

function sharedDefault(): DomainRow {
  return {
    id: "d-shared",
    host: "go.linkshift.in",
    verified: true,
    verifiedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    userId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function ownedDomain(id: string): DomainRow {
  return {
    id,
    host: "brand.example.com",
    verified: false,
    verifiedAt: null,
    isDefault: false,
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DomainsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  testState.plan = "FREE";
  testState.rows = [];
});

describe("DomainsPage custom-domain allowance", () => {
  it("Free plan: shared domain renders as shared, empty state shows, no at-cap banner", () => {
    testState.rows = [sharedDefault()];
    renderPage();

    expect(screen.getByText(/LinkShift domain\. Available on every plan\./i)).toBeInTheDocument();
    expect(screen.getByText(/Custom domains live on paid plans/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 0 used/i)).toBeInTheDocument();
    expect(screen.queryByText(/You've used all/i)).not.toBeInTheDocument();
  });

  it("a zero-domain plan never shows the at-cap banner, even if an owned row exists", () => {
    // Regression: an owned row on Free used to render “1 of 0 used” plus
    // “You've used all 0 custom domains on Free.”
    testState.rows = [ownedDomain("d-owned")];
    renderPage();

    expect(screen.getByText(/1 of 0 used/i)).toBeInTheDocument();
    expect(screen.queryByText(/You've used all/i)).not.toBeInTheDocument();
  });

  it("Starter below cap: no banner and the generic empty state", () => {
    testState.plan = "STARTER";
    testState.rows = [sharedDefault()];
    renderPage();

    expect(screen.getByText(/No custom domains yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/You've used all/i)).not.toBeInTheDocument();
  });

  it("Starter at cap: banner counts owned domains only, shared domain excluded", () => {
    testState.plan = "STARTER";
    testState.rows = [sharedDefault(), ownedDomain("d-owned")];
    renderPage();

    expect(screen.getByText(/1 of 1 used/i)).toBeInTheDocument();
    expect(screen.getByText(/You've used all 1 custom domain on Starter\./i)).toBeInTheDocument();
  });
});
