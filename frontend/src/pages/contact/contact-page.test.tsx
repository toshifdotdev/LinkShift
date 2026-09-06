import { describe, expect, it, vi, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ContactPage } from "./contact-page";
import { sendContactMessage } from "@/api/support";
import { ApiError } from "@/api/client";

vi.mock("@/api/support", () => ({
  sendContactMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/components/public-shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Contact page", () => {
  it("shows inline validation errors before anything is sent", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it("submits trimmed values and shows the received state", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Ada " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " ada@example.com " } });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "My renewal date looks wrong after upgrading." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(sendContactMessage).toHaveBeenCalledWith({
        name: "Ada",
        email: "ada@example.com",
        topic: "support",
        message: "My renewal date looks wrong after upgrading.",
      }),
    );
    expect(await screen.findByText(/your message is on its way/i)).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("surfaces a provider failure as an alert without losing the form", async () => {
    vi.mocked(sendContactMessage).mockRejectedValueOnce(new ApiError(503, "We couldn't send your message right now."));
    renderPage();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Billing question about my last receipt." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't send/i);
    expect(screen.getByLabelText("Message")).toHaveValue("Billing question about my last receipt.");
  });
});
