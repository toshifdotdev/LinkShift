import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Response } from "supertest";

const RUN = !!process.env.RUN_INTEGRATION;

vi.mock(import("../../src/utils/email"), () => ({
    sendVerificationEmail: async () => ({ delivered: true }),
    sendPasswordResetEmail: async () => ({ delivered: true }),
    resend: {},
}));

import { app } from "../../src/app";

/* Exhaust the public redirect limiter (120 / 60s) with requests that fail
   param validation before touching the database, then assert the over-limit
   response is a 429 whose body is negotiated by Accept: branded HTML for
   browsers, JSON for API clients. The limits themselves are unchanged — this
   only proves enforcement survived the handler change. */
describe.skipIf(!RUN)("visitor 429 — rate limit enforcement + content negotiation", () => {
    it("still blocks over-limit traffic and serves branded HTML to browsers", async () => {
        let blocked: Response | null = null;
        for (let i = 0; i < 130 && !blocked; i++) {
            const res = await request(app)
                .get("/tooshort")
                .set("Accept", "text/html");
            if (res.status === 429) blocked = res;
            else expect(res.status).toBe(400);
        }

        expect(blocked, "redirect limiter should still enforce its ceiling").not.toBeNull();
        expect(blocked!.status).toBe(429);
        expect(blocked!.headers["content-type"]).toContain("html");
        expect(blocked!.text).toContain("You're going a bit fast.");
        expect(blocked!.text).toContain("Too many requests. Please slow down.");
    }, 30_000);

    it("keeps the JSON contract for API clients once limited", async () => {
        const res = await request(app)
            .get("/tooshort")
            .set("Accept", "application/json");

        expect(res.status).toBe(429);
        expect(res.headers["content-type"]).toContain("application/json");
        expect(res.body).toEqual({
            success: false,
            message: "Too many requests. Please slow down.",
        });
    });
});
