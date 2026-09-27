import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { toastMock, sessionState } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  sessionState: { isAuthenticated: false },
}));

vi.mock("@/components/ui/toaster", () => ({
  useToaster: () => ({ toast: toastMock }),
}));

vi.mock("@/auth/session", () => ({
  useSession: () => ({ isAuthenticated: sessionState.isAuthenticated, user: null }),
}));

// Keep the real GOOGLE_AUTH_URL constant so we can assert the redirect target,
// but stub the network calls so importing the module is side-effect free.
vi.mock("@/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/auth")>();
  return {
    ...actual,
    register: vi.fn(),
    resendVerification: vi.fn(),
  };
});

import { RegisterPage } from "./register";
import { GOOGLE_AUTH_URL } from "@/api/auth";

let assignMock: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.isAuthenticated = false;
  assignMock = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, assign: assignMock },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe("RegisterPage Google sign-in", () => {
  it("renders the Continue with Google button alongside the create-account form", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    // The Google option must be usable even before the password rules are met.
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("starts the OAuth flow by navigating to the shared Google auth endpoint", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(assignMock).toHaveBeenCalledWith(GOOGLE_AUTH_URL);
  });
});
