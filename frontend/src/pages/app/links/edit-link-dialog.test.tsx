import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditLinkDialog } from "./edit-link-dialog";
import { updateLink } from "@/api/links";
import type { LinkItem } from "@/types/api";

const planState = vi.hoisted(() => ({ plan: "PRO" }));

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
  updateLink: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

const link: LinkItem = {
  id: "l1",
  name: "My link",
  targetUrl: "https://example.com",
  shortId: "abc123",
  isActive: true,
  deepLink: false,
  expiresAt: null,
  createdAt: "",
  updatedAt: "",
  clicks: 0,
  domainId: "d1",
  domainHost: "go.linkshift.in",
};

function renderDialog(override?: Partial<LinkItem>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditLinkDialog link={{ ...link, ...override }} onClose={() => {}} onSaved={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EditLinkDialog short-link preview", () => {
  it("defaults the preview to the account's default domain and current slug", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText("go.linkshift.in/")).toBeInTheDocument();
    });
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("shows the link's real custom domain by default (regression: custom-domain links must not preview the default host)", async () => {
    renderDialog({ domainId: "d2", domainHost: "nadeem.io" });
    await waitFor(() => {
      expect(screen.getByText("nadeem.io/")).toBeInTheDocument();
    });
    expect(screen.queryByText("go.linkshift.in/")).not.toBeInTheDocument();
  });

  it("updates the preview prefix immediately when switching to a custom domain", async () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText("Move to a different domain"));

    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select.querySelectorAll("option").length).toBeGreaterThan(1));
    fireEvent.change(select, { target: { value: "d2" } });

    await waitFor(() => {
      expect(screen.getByText("nadeem.io/")).toBeInTheDocument();
    });
  });

  it("falls back to the default domain when the switch is turned back off", async () => {
    renderDialog();
    const toggle = screen.getByLabelText("Move to a different domain");
    fireEvent.click(toggle);
    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select.querySelectorAll("option").length).toBeGreaterThan(1));
    fireEvent.change(select, { target: { value: "d2" } });
    await waitFor(() => expect(screen.getByText("nadeem.io/")).toBeInTheDocument());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("go.linkshift.in/")).toBeInTheDocument());
  });
});

describe("EditLinkDialog deep linking (Pro-gated)", () => {
  afterEach(() => {
    planState.plan = "PRO";
  });

  it("PRO: seeds the toggle from the link's deepLink flag", () => {
    renderDialog({ deepLink: true });
    const toggle = screen.getByLabelText("Forward appended paths and query strings to the destination");
    expect(toggle).toBeChecked();
  });

  it("PRO: sends deepLink in the save payload", async () => {
    renderDialog({ deepLink: true });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateLink).toHaveBeenCalledWith("l1", expect.objectContaining({ deepLink: true })),
    );
  });

  it("CREATOR: hides the toggle and warns that forwarding pauses off Pro (link has deep linking)", () => {
    planState.plan = "CREATOR";
    renderDialog({ deepLink: true });
    expect(
      screen.queryByLabelText("Forward appended paths and query strings to the destination"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Forwarding pauses while you're not on Pro/i)).toBeInTheDocument();
  });

  it("CREATOR: shows the generic upgrade hint when the link has no deep linking", () => {
    planState.plan = "CREATOR";
    renderDialog({ deepLink: false });
    expect(
      screen.getByText(/Route visitors to any path on your destination/i),
    ).toBeInTheDocument();
  });
});
