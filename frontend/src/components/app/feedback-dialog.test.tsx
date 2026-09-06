import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackDialog } from "./feedback-dialog";
import { sendFeedback } from "@/api/support";

vi.mock("@/api/support", () => ({
  sendFeedback: vi.fn().mockResolvedValue({ success: true }),
}));

function renderDialog() {
  return render(<FeedbackDialog open onOpenChange={() => {}} />);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Feedback dialog", () => {
  it("rejects feedback shorter than 10 characters", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it("sends the chosen category and confirms with a thank-you state", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Feedback"), {
      target: { value: "The analytics range switch is the best part of the dashboard." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() =>
      expect(sendFeedback).toHaveBeenCalledWith({
        category: "general",
        message: "The analytics range switch is the best part of the dashboard.",
      }),
    );
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
  });
});
