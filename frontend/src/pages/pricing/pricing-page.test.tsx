import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ApiPlan } from "@/api/billing";

const { toastMock, tokenState, sessionState, billingMocks } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  tokenState: { token: null as string | null },
  sessionState: { isAuthenticated: false },
  billingMocks: {
    getPlans: vi.fn(),
    getSubscription: vi.fn(),
    subscribe: vi.fn(),
    verifySubscription: vi.fn(),
  },
}));

vi.mock("@/components/ui/toaster", () => ({
  useToaster: () => ({ toast: toastMock }),
}));

vi.mock("@/api/token", () => ({
  getAccessToken: () => tokenState.token,
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

vi.mock("@/auth/session", () => ({
  useSession: () => ({ isAuthenticated: sessionState.isAuthenticated, user: null }),
}));

vi.mock("@/api/billing", () => billingMocks);

vi.mock("@/pages/landing/landing-navbar", () => ({ LandingNavbar: () => null }));
vi.mock("@/pages/landing/sections/footer", () => ({ Footer: () => null }));

import { PricingPage } from "./pricing-page";

const PLANS: ApiPlan[] = [
  {
    name: "STARTER",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    currency: "INR",
    maxLinks: 500,
    maxQrPerMonth: 50,
    maxDomains: 1,
    maxRedirectsPerMonth: 10000,
    analyticsDays: 90,
    maxCustomSlugsPerMonth: 10,
    maxDestinationChangesPerMonth: 10,
  },
  {
    name: "CREATOR",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    currency: "INR",
    maxLinks: 2000,
    maxQrPerMonth: 200,
    maxDomains: 3,
    maxRedirectsPerMonth: 50000,
    analyticsDays: 365,
    maxCustomSlugsPerMonth: 50,
    maxDestinationChangesPerMonth: 50,
  },
  {
    name: "PRO",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: "INR",
    maxLinks: null,
    maxQrPerMonth: null,
    maxDomains: 10,
    maxRedirectsPerMonth: null,
    analyticsDays: 730,
    maxCustomSlugsPerMonth: null,
    maxDestinationChangesPerMonth: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/pricing"]}>
      <Routes>
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<div>login route reached</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenState.token = null;
  sessionState.isAuthenticated = false;
  sessionStorage.clear();
  billingMocks.getPlans.mockResolvedValue({
    success: true,
    currency: "INR",
    plans: PLANS,
  });
  billingMocks.getSubscription.mockResolvedValue({ success: true, subscription: null });
});

describe("PricingPage public access + checkout journey", () => {
  it("renders plans for a signed-out visitor without any auth messaging", async () => {
    renderPage();

    // Desktop matrix + mobile stack both render each CTA.
    await screen.findAllByText("Choose Starter");
    expect(screen.queryByText(/not authenticated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/authentication is coming/i)).not.toBeInTheDocument();
  });

  it("routes a signed-out subscribe click through sign-in with the plan intent", async () => {
    renderPage();

    const [cta] = await screen.findAllByText("Choose Starter");
    fireEvent.click(cta);

    await screen.findByText("login route reached");
    expect(JSON.parse(sessionStorage.getItem("ls:plan-intent")!)).toEqual({
      plan: "STARTER",
      cycle: "MONTHLY",
    });
    expect(toastMock).not.toHaveBeenCalled();
    expect(billingMocks.subscribe).not.toHaveBeenCalled();
  });

  it("shows a recovery panel — not an auth error — when plans fail to load", async () => {
    billingMocks.getPlans.mockRejectedValue(new Error("Network is down"));
    renderPage();

    expect(await screen.findByText("Plans unavailable")).toBeInTheDocument();
    expect(screen.getByText("Network is down")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("shows the loading skeleton while prices resolve", () => {
    billingMocks.getPlans.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByLabelText("Loading plans")).toBeInTheDocument();
    expect(screen.queryByText("Plans unavailable")).not.toBeInTheDocument();
  });
});
