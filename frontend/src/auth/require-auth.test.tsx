import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./require-auth";
import { setAccessToken, clearAccessToken } from "@/api/token";

const mockSession = vi.fn();
vi.mock("@/auth/session", () => ({
  useSession: () => mockSession(),
  useLogout: () => vi.fn(),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<div>protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth guard", () => {
  beforeEach(() => {
    clearAccessToken();
    mockSession.mockReset();
  });

  it("redirects to /login when there is no token", () => {
    mockSession.mockReturnValue({ isLoading: false, isAuthenticated: false, hasError: false, refetch: vi.fn() });
    renderGuard();
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("renders the protected route when a token is present and the session is authenticated", () => {
    setAccessToken("some-token");
    mockSession.mockReturnValue({ isLoading: false, isAuthenticated: true, hasError: false, refetch: vi.fn() });
    renderGuard();
    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });

  it("shows a recovery state (not a blank screen) on a non-401 bootstrap error", () => {
    setAccessToken("some-token");
    mockSession.mockReturnValue({ isLoading: false, isAuthenticated: false, hasError: true, refetch: vi.fn() });
    renderGuard();
    expect(screen.getByText(/couldn't load your workspace/i)).toBeInTheDocument();
  });
});
