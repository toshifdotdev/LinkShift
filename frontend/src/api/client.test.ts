import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
import { setAccessToken, getAccessToken, clearAccessToken } from "./token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch single-flight token refresh", () => {
  beforeEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("issues exactly one refresh for several concurrent 401s, then retries all with the new token", async () => {
    setAccessToken("old");
    const refreshSpy = vi.fn();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshSpy();
        return jsonResponse({ accessToken: "new" });
      }
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const auth = headers["Authorization"];
      if (auth === "Bearer new") return jsonResponse({ success: true, data: "ok" });
      return jsonResponse({ message: "Token expired" }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b, c] = await Promise.all([
      apiFetch("/links"),
      apiFetch("/domains"),
      apiFetch("/dashboard/stats"),
    ]);

    // Only one refresh despite three simultaneous 401s.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // Every caller got its retried, authorized response.
    expect(a).toEqual({ success: true, data: "ok" });
    expect(b).toEqual({ success: true, data: "ok" });
    expect(c).toEqual({ success: true, data: "ok" });
    // The rotated token was stored for subsequent requests.
    expect(getAccessToken()).toBe("new");
    vi.unstubAllGlobals();
  });

  it("clears the token and does not retry when the refresh itself fails", async () => {
    setAccessToken("old");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return jsonResponse({ message: "nope" }, 401);
      return jsonResponse({ message: "Token expired" }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/links")).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
    vi.unstubAllGlobals();
  });
});
