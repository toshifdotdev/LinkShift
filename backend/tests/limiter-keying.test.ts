import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "express-rate-limit";

// M1 core security proof: with TRUST_PROXY_HOPS=0 the limiter MUST key on the
// resolved req.ip and IGNORE client-supplied X-Forwarded-For entries.

type FakeReq = {
    headers: Record<string, string>;
    ip: string;
    method: string;
    url: string;
};

function makeLimiter(limit: number) {
    return rateLimit({
        windowMs: 60_000,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        validate: { xForwardedForHeader: false },
        message: { success: false },
    });
}

function makeReq(ip: string, xff?: string, trustProxyHops: number | null = 0): FakeReq {
    const headers: Record<string, string> = {};
    if (xff !== undefined) headers["x-forwarded-for"] = xff;
    return {
        headers,
        ip,
        method: "GET",
        url: "/r/test",
        app: { get: () => trustProxyHops },
    };
}

function makeRes() {
    const res: any = {
        statusCode: 200,
        ended: false,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        send(body?: unknown) {
            this.body = body;
            this.end();
        },
        setHeader() {},
        end(this: any) {
            this.ended = true;
        },
        json(body: unknown) {
            this.body = body;
            this.end();
        },
    };
    return res;
}

async function pass(mw: any, req: FakeReq) {
    const res = makeRes();
    const next = vi.fn();
    await mw(req as never, res, next);
    return { limited: res.ended || res.statusCode === 429, nextCalls: next.mock.calls.length };
}

describe("rate-limit keying under trust proxy configuration", () => {
    it("IGNORES forged X-Forwarded-For when no proxy is trusted (hops=0)", async () => {
        const mw = makeLimiter(2);

        const r1 = await pass(mw, makeReq("203.0.113.7", "9.9.9.9"));
        const r2 = await pass(mw, makeReq("203.0.113.7", "8.8.8.8"));
        const r3 = await pass(mw, makeReq("203.0.113.7", "7.7.7.7"));

        expect(r1.limited).toBe(false);
        expect(r2.limited).toBe(false);
        // Third request from the SAME socket IP is limited even though every
        // request presented a different forged XFF entry.
        expect(r3.limited).toBe(true);
    });

    it("keys on the RESOLVED client ip when one proxy hop is trusted (hops=1)", async () => {
        // Express resolves these to distinct ips; simulate by distinct ip fields.
        const mw = makeLimiter(2);

        const a = await pass(mw, makeReq("198.51.100.10", undefined, 1));
        const b = await pass(mw, makeReq("198.51.100.11", undefined, 1));
        const c = await pass(mw, makeReq("198.51.100.12", undefined, 1));

        expect(a.limited).toBe(false);
        expect(b.limited).toBe(false);
        expect(c.limited).toBe(false); // different real clients — independent buckets
    });
});
