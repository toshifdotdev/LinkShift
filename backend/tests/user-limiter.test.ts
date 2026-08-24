import { describe, expect, it, vi } from "vitest";
import { createUserRateLimiter } from "../src/middleware/rateLimit.middleware";

function makeReq(authId?: string) {
    return {
        headers: {} as Record<string, string>,
        ip: "203.0.113.50",
        method: "POST",
        url: "/test",
        auth: authId ? { id: authId, email: "x@y.z" } : undefined,
    };
}

function makeRes() {
    const res: any = {
        statusCode: 200,
        ended: false,
        status(c: number) { this.statusCode = c; return this; },
        setHeader() {},
        send(b?: unknown) { this.body = b; this.end(); },
        json(b?: unknown) { this.body = b; this.end(); },
        end() { this.ended = true; },
    };
    return res;
}

async function pass(mw: any, req: any) {
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res, next);
    return { limited: res.ended || res.statusCode === 429 };
}

// limit N ⇒ requests 1..N pass, N+1 is limited (inclusive-then-block).
const mw = createUserRateLimiter({
    windowMs: 60_000,
    limit: 2,
    message: { success: false, message: "slow down" },
});

describe("user-keyed mutation limiter (M4)", () => {
    it("buckets per USER id, not per IP", async () => {
        const u1a = await pass(mw, makeReq("user-1"));
        const u1b = await pass(mw, makeReq("user-1"));
        const u1c = await pass(mw, makeReq("user-1")); // over the ceiling
        const u2 = await pass(mw, makeReq("user-2"));  // different user unaffected

        expect(u1a.limited).toBe(false);
        expect(u1b.limited).toBe(false);
        expect(u1c.limited).toBe(true);
        expect(u2.limited).toBe(false);
    });

    it("falls back to req.ip (IPv6-safe helper key) without auth", async () => {
        const a = await pass(mw, makeReq(undefined));
        const b = await pass(mw, makeReq(undefined));
        const c = await pass(mw, makeReq(undefined));

        expect(a.limited).toBe(false);
        expect(b.limited).toBe(false);
        expect(c.limited).toBe(true);
    });

    it("returns the configured message body when limiting", async () => {
        const fresh = createUserRateLimiter({
            windowMs: 60_000,
            limit: 1,
            message: { success: false, message: "slow down" },
        });
        await pass(fresh, makeReq("msg-user"));
        const res = makeRes();
        const next = vi.fn();
        await fresh(makeReq("msg-user") as never, res as never, next);
        expect(res.statusCode).toBe(429);
        expect(res.body?.message ?? res.body).toBeDefined();
    });
});
