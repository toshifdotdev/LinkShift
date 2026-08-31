import { describe, expect, it, vi } from "vitest";

vi.mock(import("../src/config"), () => ({
    config: { frontendUrl: "http://localhost:5173" },
}));

import {
    createVisitorRateLimitHandler,
    errorMiddleware,
    renderPublicError,
} from "../src/middleware/error.middleware";
import { AppError } from "../src/errors/AppError";

const MESSAGE = { success: false, message: "Too many requests. Please slow down." };

function fakeRes() {
    const res = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: undefined as unknown,
        status(code: number) { this.statusCode = code; return this; },
        set(key: string, value: string) { this.headers[key] = value; return this; },
        type(value: string) { this.headers["Content-Type"] = value; return this; },
        send(body: unknown) { this.body = body; return this; },
        json(body: unknown) { this.body = body; this.headers["Content-Type"] = "application/json"; return this; },
    };
    return res;
}

function fakeReq(accept: string, path = "/abc1234") {
    return { headers: { accept }, path } as never;
}

describe("visitor 429 rate-limit handler", () => {
    const handler = createVisitorRateLimitHandler(MESSAGE);

    it("serves the branded HTML page to browsers (keeps 429)", () => {
        const res = fakeRes();
        handler(fakeReq("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), res as never);
        expect(res.statusCode).toBe(429);
        expect(String(res.headers["Content-Type"])).toContain("html");
        expect(String(res.body)).toContain("You're going a bit fast.");
        expect(String(res.body)).toContain(MESSAGE.message);
    });

    it("keeps the machine-readable JSON contract for API clients (keeps 429)", () => {
        const res = fakeRes();
        handler(fakeReq("application/json"), res as never);
        expect(res.statusCode).toBe(429);
        expect(res.headers["Content-Type"]).toBe("application/json");
        expect(res.body).toEqual(MESSAGE);
    });

    it("treats wildcard Accept (curl/scripts without html) as HTML unless JSON is requested", () => {
        const res = fakeRes();
        handler(fakeReq("*/*"), res as never);
        expect(res.statusCode).toBe(429);
        expect(String(res.headers["Content-Type"])).toContain("html");
    });
});

describe("branded 429 page copy", () => {
    it("renders a 429 kicker, headline, and the provided note", () => {
        const html = renderPublicError(429, "Slow down please.");
        expect(html).toContain(">429<");
        expect(html).toContain("You're going a bit fast.");
        expect(html).toContain("Slow down please.");
    });

    it("escapes HTML in the note", () => {
        const html = renderPublicError(429, "<script>alert(1)</script>");
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;");
    });
});

describe("errorMiddleware quota 429 content negotiation", () => {
    const quotaError = new AppError("Redirect allowance exceeded. Please upgrade.", 429);
    const next = vi.fn();

    it("returns branded HTML to browsers on the public short-link path", () => {
        const res = fakeRes();
        errorMiddleware(quotaError, fakeReq("text/html"), res as never, next);
        expect(res.statusCode).toBe(429);
        expect(String(res.body)).toContain("<!doctype html>");
        expect(String(res.body)).toContain("You're going a bit fast.");
        expect(next).not.toHaveBeenCalled();
    });

    it("returns JSON to API clients for the same quota error", () => {
        const res = fakeRes();
        errorMiddleware(quotaError, fakeReq("application/json"), res as never, next);
        expect(res.statusCode).toBe(429);
        expect(res.headers["Content-Type"]).toBe("application/json");
        expect(res.body).toEqual({ success: false, message: quotaError.message });
        expect(next).not.toHaveBeenCalled();
    });
});
