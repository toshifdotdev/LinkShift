import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Regression: the Google OAuth session handoff must carry the access token in
// the redirect FRAGMENT (#accessToken=…), never the query string — fragments
// are never sent to any server, keeping the token out of history submissions
// and access logs. Hermetic: no database, no HTTP.
// ---------------------------------------------------------------------------

const { config } = vi.hoisted(() => {
    // Placeholder credentials so module imports succeed without real secrets
    // (email/cloudinary constructors validate at import time — CI convention).
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    return { config: { frontendUrl: "https://linkshift.in", node_env: "test" } };
});

vi.mock(import("../src/config"), () => ({ config }));

import { googleCallbackController } from "../src/features/auth/auth.controller";

function callController(accessToken: string) {
    const res = { cookie: vi.fn(), redirect: vi.fn() };
    const req = {
        user: { accessToken, refreshToken: "refresh-token-value" },
    };
    googleCallbackController(req as never, res as never);
    return res;
}

describe("googleCallbackController redirect format", () => {
    it("passes the access token in the fragment, not the query string", () => {
        const res = callController("jwt-token-value");

        expect(res.redirect).toHaveBeenCalledTimes(1);
        const target = res.redirect.mock.calls[0][0] as string;
        expect(target).toContain("/auth/google/callback#accessToken=jwt-token-value");
        expect(target).not.toContain("?accessToken");
        expect(target).not.toContain("%3FaccessToken");
    });

    it("URL-encodes the token so fragment delimiters cannot be injected", () => {
        const res = callController("a/b+c d&x=1#y");

        const target = res.redirect.mock.calls[0][0] as string;
        expect(target).toContain("#accessToken=a%2Fb%2Bc%20d%26x%3D1%23y");
        // The raw metacharacters must not appear unencoded in the fragment.
        expect(target.endsWith("#accessToken=a/b+c d&x=1#y")).toBe(false);
    });

    it("still sets the httpOnly refresh cookie on the API origin", () => {
        const res = callController("jwt-token-value");

        expect(res.cookie).toHaveBeenCalledWith(
            "refreshToken",
            "refresh-token-value",
            expect.objectContaining({ httpOnly: true }),
        );
    });
});
