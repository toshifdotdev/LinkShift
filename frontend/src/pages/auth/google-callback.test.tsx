import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { setAccessTokenMock } = vi.hoisted(() => ({ setAccessTokenMock: vi.fn() }));

vi.mock("@/api/token", () => ({ setAccessToken: setAccessTokenMock }));

import { GoogleCallbackPage } from "./google-callback";

function renderCallback() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/auth/google/callback"]}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/app" element={<div>app-landed</div>} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  // Drop any fragment a previous test installed on the real jsdom location.
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
});

describe("GoogleCallbackPage fragment handoff", () => {
  it("reads the access token from the URL fragment, stores it and lands in /app", () => {
    window.history.replaceState(
      null,
      "",
      "/auth/google/callback#accessToken=fragment-token-123",
    );

    renderCallback();

    expect(setAccessTokenMock).toHaveBeenCalledWith("fragment-token-123");
    expect(screen.getByText("app-landed")).toBeInTheDocument();
  });

  it("decodes an encoded token value", () => {
    window.history.replaceState(
      null,
      "",
      "/auth/google/callback#accessToken=a%2Fb%2Bc%20d",
    );

    renderCallback();

    expect(setAccessTokenMock).toHaveBeenCalledWith("a/b+c d");
  });

  it("shows the recovery state when no fragment token is present", () => {
    window.history.replaceState(null, "", "/auth/google/callback");

    renderCallback();

    expect(setAccessTokenMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Sign-in didn't finish/i)).toBeInTheDocument();
  });
});
