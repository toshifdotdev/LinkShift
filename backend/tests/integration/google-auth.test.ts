import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";

const RUN = !!process.env.RUN_INTEGRATION;

vi.mock(import("../../src/utils/email"), () => ({
    sendVerificationEmail: async () => ({ delivered: true }),
    sendPasswordResetEmail: async () => ({ delivered: true }),
    resend: {},
}));

import { app } from "../../src/app";
import { config } from "../../src/config";
import { OAUTH_STATE_COOKIE, STATE_COOKIE_PATH } from "../../src/features/auth/oauthState";

const hashState = (state: string) =>
    createHash("sha256").update(state).digest("hex");

/* The happy path exchanges the code with Google over the network, so these
   tests exercise everything up to that boundary: state issuance, forged /
   missing / mismatched state, Google-side denials, and the failure page. */
describe.skipIf(!RUN)("Google OAuth state + failure handling", () => {
    it("issues a state param paired with a hashed state cookie on start", async () => {
        const res = await request(app).get("/api/v1/auth/google");

        expect(res.status).toBe(302);
        const location = new URL(res.headers.location);
        expect(location.origin).toBe("https://accounts.google.com");
        const state = location.searchParams.get("state");
        expect(state).toBeTruthy();

        const setCookie = (res.headers["set-cookie"] ?? []).join("\n");
        expect(setCookie).toContain(`${OAUTH_STATE_COOKIE}=${hashState(state!)}`);
        expect(setCookie).toMatch(/HttpOnly/i);
        expect(setCookie).toMatch(/SameSite=Lax/i);
        expect(setCookie).toMatch(new RegExp(`Path=${STATE_COOKIE_PATH.replace(/\//g, "\\/")}`, "i"));
        // The raw state must never appear in the cookie.
        expect(setCookie).not.toContain(state!);
    });

    it("rejects a callback that has no state cookie at all", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google/callback")
            .query({ code: "attacker-code", state: "forged-state" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/api/v1/auth/google/failure");
    });

    it("rejects a callback whose state does not match the issued cookie", async () => {
        const start = await request(app).get("/api/v1/auth/google");
        const stateCookie = start.headers["set-cookie"]![0];

        const res = await request(app)
            .get("/api/v1/auth/google/callback")
            .set("Cookie", stateCookie)
            .query({ code: "attacker-code", state: "forged-state" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/api/v1/auth/google/failure");
    });

    it("rejects a callback that omits the state parameter entirely", async () => {
        const start = await request(app).get("/api/v1/auth/google");
        const stateCookie = start.headers["set-cookie"]![0];

        const res = await request(app)
            .get("/api/v1/auth/google/callback")
            .set("Cookie", stateCookie)
            .query({ code: "attacker-code" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/api/v1/auth/google/failure");
    });

    it("routes a Google-side denial to the clean failure page", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google/callback")
            .query({ error: "access_denied", state: "anything" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/api/v1/auth/google/failure");
    });

    it("redirects provider-side errors to the sign-in banner instead of JSON", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google/callback")
            .query({ error: "server_error", state: "anything" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${config.frontendUrl}/login?error=google`);
    });

    it("failure page lands on the frontend login banner and clears the state cookie", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google/failure")
            .set("Cookie", `${OAUTH_STATE_COOKIE}=stale-hash`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${config.frontendUrl}/login?error=google`);
        const setCookie = (res.headers["set-cookie"] ?? []).join("\n");
        expect(setCookie).toContain(`${OAUTH_STATE_COOKIE}=;`);
    });
});
