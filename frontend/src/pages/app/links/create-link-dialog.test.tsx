import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateLinkDialog } from "./create-link-dialog";

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
  createLink: vi.fn(),
}));

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateLinkDialog open onOpenChange={() => {}} onCreated={() => {}} />
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
