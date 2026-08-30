import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditLinkDialog } from "./edit-link-dialog";
import type { LinkItem } from "@/types/api";

vi.mock("@/auth/session", () => ({
  useSession: () => ({
    user: { plan: { name: "PRO" } },
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
  updateLink: vi.fn(),
}));

const link: LinkItem = {
  id: "l1",
  name: "My link",
  targetUrl: "https://example.com",
  shortId: "abc123",
  isActive: true,
  expiresAt: null,
  createdAt: "",
  updatedAt: "",
  clicks: 0,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditLinkDialog link={link} onClose={() => {}} onSaved={() => {}} />
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
