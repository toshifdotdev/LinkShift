import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateLinkDialog } from "./create-link-dialog";
import { createLink } from "@/api/links";

const planState = vi.hoisted(() => ({ plan: "PRO" }));

const createdLink = vi.hoisted(() => ({
  id: "l1",
  name: null,
  targetUrl: "https://example.com/app",
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
  createdAt: "",
  updatedAt: "",
  clicks: 0,
  domainId: "d1",
  domainHost: "go.linkshift.in",
}));

vi.mock("@/auth/session", () => ({
  useSession: () => ({
    user: { plan: { name: planState.plan } },
  }),
}));

vi.mock("@/api/domains", () => ({
  getDomains: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: "d1", host: "go.linkshift.in", verified: true, verifiedAt: null, isDefault: true, userId: null, createdAt: "" },
      { id: "d2", host: "nadeem.io", verified: true, verifiedAt: null, isDefault: false, userId: "u1", createdAt: "" },
    ],
  }),
}));

vi.mock("@/api/links", () => ({
  createLink: vi.fn().mockResolvedValue({ message: "Link Created", data: createdLink }),
}));

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateLinkDialog open onOpenChange={() => {}} onCreated={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CreateLinkDialog short-link preview", () => {
  it("defaults the preview to the account's default domain", async () => {
    renderDialog();
    const preview = await screen.findByLabelText("Short link preview");
    expect(preview).toHaveTextContent("go.linkshift.in/");
  });

  it("updates the preview prefix immediately when a custom domain is selected", async () => {
    renderDialog();
    const select = await screen.findByLabelText("Domain");
    await waitFor(() => expect(select).toHaveValue("d1"));

    fireEvent.change(select, { target: { value: "d2" } });

    const preview = screen.getByLabelText("Short link preview");
    expect(preview).toHaveTextContent("nadeem.io/");
    expect(preview).not.toHaveTextContent("go.linkshift.in/");
  });

  it("switches back to the default domain when re-selected", async () => {
    renderDialog();
    const select = await screen.findByLabelText("Domain");
    await waitFor(() => expect(select).toHaveValue("d1"));

    fireEvent.change(select, { target: { value: "d2" } });
    expect(screen.getByLabelText("Short link preview")).toHaveTextContent("nadeem.io/");

    fireEvent.change(select, { target: { value: "d1" } });
    expect(screen.getByLabelText("Short link preview")).toHaveTextContent("go.linkshift.in/");
  });
});

describe("CreateLinkDialog path forwarding (Pro-gated)", () => {
  afterEach(() => {
    planState.plan = "PRO";
  });

  async function openAdvancedWithDestination() {
    renderDialog();
    const select = await screen.findByLabelText("Domain");
    await waitFor(() => expect(select).toHaveValue("d1"));
    fireEvent.change(screen.getByLabelText("Destination URL"), {
      target: { value: "https://example.com/app" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Advanced/ }));
  }

  it("PRO: submitting with the toggle checked sends deepLink:true", async () => {
    await openAdvancedWithDestination();
    fireEvent.click(
      screen.getByLabelText("Forward appended paths and query strings to the destination"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() => expect(createLink).toHaveBeenCalled());
    const payload = vi.mocked(createLink).mock.calls.at(-1)?.[0];
    expect(payload?.deepLink).toBe(true);
  });

  it("PRO: leaving the toggle off omits deepLink from the payload", async () => {
    await openAdvancedWithDestination();
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() => expect(createLink).toHaveBeenCalled());
    const payload = vi.mocked(createLink).mock.calls.at(-1)?.[0];
    expect(payload?.deepLink).toBeUndefined();
  });

  it("CREATOR: shows an upgrade hint instead of the toggle", async () => {
    planState.plan = "CREATOR";
    await openAdvancedWithDestination();
    expect(
      screen.queryByLabelText("Forward appended paths and query strings to the destination"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Route visitors to any path on your destination/i),
    ).toBeInTheDocument();
  });
});

describe("CreateLinkDialog mobile app deep linking (Pro-gated)", () => {
  afterEach(() => {
    planState.plan = "PRO";
  });

  async function openAdvancedWithDestination() {
    renderDialog();
    const select = await screen.findByLabelText("Domain");
    await waitFor(() => expect(select).toHaveValue("d1"));
    fireEvent.change(screen.getByLabelText("Destination URL"), {
      target: { value: "https://example.com/app" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Advanced/ }));
  }

  it("PRO: enabling the toggle reveals config inputs; submitting sends the app config", async () => {
    await openAdvancedWithDestination();
    expect(screen.queryByLabelText("App URI scheme *")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open your app on mobile when it's installed"));
    fireEvent.change(screen.getByLabelText("App URI scheme *"), { target: { value: "myapp" } });
    fireEvent.change(screen.getByLabelText("Android package"), {
      target: { value: "com.example.app" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() => expect(createLink).toHaveBeenCalled());
    const payload = vi.mocked(createLink).mock.calls.at(-1)?.[0];
    expect(payload?.appDeepLink).toBe(true);
    expect(payload?.appScheme).toBe("myapp");
    expect(payload?.androidPackage).toBe("com.example.app");
  });

  it("PRO: blocks submit when the feature is on but the scheme is missing", async () => {
    await openAdvancedWithDestination();
    fireEvent.click(screen.getByLabelText("Open your app on mobile when it's installed"));
    const callsBefore = vi.mocked(createLink).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() =>
      expect(screen.getByText(/A URI scheme is required/i)).toBeInTheDocument(),
    );
    expect(vi.mocked(createLink).mock.calls.length).toBe(callsBefore);
  });

  it("CREATOR: shows an upgrade hint instead of the app config", async () => {
    planState.plan = "CREATOR";
    await openAdvancedWithDestination();
    expect(
      screen.queryByLabelText("Open your app on mobile when it's installed"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Send mobile visitors straight into your app/i),
    ).toBeInTheDocument();
  });
});
