import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Redirect-host crawler protection (items under test):
//
//   /robots.txt on go.linkshift.in  → "User-agent: *\nDisallow: /\n"
//   any response on go.linkshift.in → X-Robots-Tag: noindex, nofollow
//
// Critically, the marketing host (linkshift.in / www.linkshift.in) must stay
// fully indexable, and custom short domains must be treated as redirect hosts.
//
// Hermetic: pure middleware invocation, no HTTP server, no database. Same
// hand-rolled req/res convention as tests/visitor-429.test.ts.
// ---------------------------------------------------------------------------

import {
    NOINDEX_HEADER,
    REDIRECT_HOST,
    REDIRECT_ROBOTS_TXT,
    isRedirectHost,
    normalizeHost,
    redirectHostNoIndex,
    redirectHostRobots,
} from "../src/middleware/crawler.middleware";

function fakeRes() {
    const res = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        set(key: string, value: string) {
            this.headers[key] = value;
            return this;
        },
        type(value: string) {
            this.headers["Content-Type"] = value;
            return this;
        },
        send(body: unknown) {
            this.body = body;
            return this;
        },
    };
    return res;
}

function fakeReq(host: string | undefined) {
    return { headers: host === undefined ? {} : { host } } as never;
}

describe("normalizeHost", () => {
    it("lower-cases and strips the port", () => {
        expect(normalizeHost("GO.LinkShift.IN:3000")).toBe("go.linkshift.in");
        expect(normalizeHost(undefined)).toBe("");
    });
});

describe("isRedirectHost", () => {
    it("treats the short-link host as a redirect host", () => {
        expect(isRedirectHost("go.linkshift.in")).toBe(true);
        expect(isRedirectHost("go.linkshift.in:3000")).toBe(true);
    });

    it("never treats the marketing host as a redirect host", () => {
        expect(isRedirectHost("linkshift.in")).toBe(false);
        expect(isRedirectHost("www.linkshift.in")).toBe(false);
        expect(isRedirectHost("LINKSHIFT.IN")).toBe(false);
    });

    it("treats custom short domains as redirect hosts", () => {
        // A user's own domain serves redirects, never the marketing site.
        expect(isRedirectHost("links.acme.com")).toBe(true);
    });

    it("is conservative when the Host header is absent", () => {
        expect(isRedirectHost(undefined)).toBe(false);
        expect(isRedirectHost("")).toBe(false);
    });
});

describe("redirectHostRobots", () => {
    const handler = redirectHostRobots;

    it("serves a disallow-all robots.txt on the short-link host", () => {
        const res = fakeRes();
        handler(fakeReq(REDIRECT_HOST) as never, res as never, () => {});

        expect(res.statusCode).toBe(200);
        expect(res.body).toBe("User-agent: *\nDisallow: /\n");
        expect(res.body).toBe(REDIRECT_ROBOTS_TXT);
    });

    it("serves plain text so crawlers parse it as robots.txt", () => {
        const res = fakeRes();
        handler(fakeReq(REDIRECT_HOST) as never, res as never, () => {});

        expect(String(res.headers["Content-Type"])).toContain("text/plain");
    });

    it("falls through on the marketing host so its own robots.txt wins", () => {
        const res = fakeRes();
        let called = false;
        handler(fakeReq("linkshift.in") as never, res as never, () => {
            called = true;
        });

        expect(called).toBe(true);
        expect(res.body).toBeUndefined();
        expect(res.statusCode).toBe(200);
    });

    it("falls through when the Host header is absent", () => {
        let called = false;
        handler(fakeReq(undefined) as never, fakeRes() as never, () => {
            called = true;
        });
        expect(called).toBe(true);
    });
});

describe("redirectHostNoIndex", () => {
    const handler = redirectHostNoIndex;

    it("stamps X-Robots-Tag on short-link host responses", () => {
        const res = fakeRes();
        handler(fakeReq(REDIRECT_HOST) as never, res as never, () => {});

        expect(res.headers["X-Robots-Tag"]).toBe(NOINDEX_HEADER);
        expect(res.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
    });

    it("covers redirect responses, which have no HTML head", () => {
        // The whole point of using a header: a 302 carries no <head>, so a
        // meta-tag-only defence would leave every short link crawlable.
        const res = fakeRes();
        handler(fakeReq(REDIRECT_HOST) as never, res as never, () => {});
        res.status(302).set("Location", "https://example.com/");

        expect(res.statusCode).toBe(302);
        expect(res.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
    });

    it("never stamps the marketing host", () => {
        const res = fakeRes();
        handler(fakeReq("linkshift.in") as never, res as never, () => {});

        expect(res.headers["X-Robots-Tag"]).toBeUndefined();
    });

    it("never stamps www.linkshift.in", () => {
        const res = fakeRes();
        handler(fakeReq("www.linkshift.in") as never, res as never, () => {});

        expect(res.headers["X-Robots-Tag"]).toBeUndefined();
    });

    it("always calls next() so redirect behaviour is untouched", () => {
        for (const host of [REDIRECT_HOST, "linkshift.in", undefined]) {
            let called = false;
            handler(fakeReq(host) as never, fakeRes() as never, () => {
                called = true;
            });
            expect(called, `next() not called for host ${String(host)}`).toBe(true);
        }
    });
});
