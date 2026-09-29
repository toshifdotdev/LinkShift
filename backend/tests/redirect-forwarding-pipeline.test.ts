import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";

// ---------------------------------------------------------------------------
// End-to-end proof of the two routing features on one request, at the level
// where they actually meet: the real redirect router -> controller -> service ->
// applyDeepLink, with only the outside world (DB, cache, geo, plan lookups,
// rate limiters) stubbed.
//
// Documented product contract this suite pins down:
//   Your link      https://go.linkshift.in/krish
//   Visitor opens  https://go.linkshift.in/krish/products/123?ref=campaign
//   Destination    https://example.com/base/products/123?utm_source=...&ref=campaign
// i.e. the configured UTM tags live on the DESTINATION (link.service bakes them
// into the stored targetUrl), while the visitor's appended path and query are
// forwarded verbatim - and neither set is allowed to swallow the other.
//
// Hermetic: no Postgres, no Redis.
// ---------------------------------------------------------------------------

const { prisma, checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess } = vi.hoisted(
    () => ({
        prisma: {
            link: { findFirst: vi.fn() },
            domain: { findUnique: vi.fn(), findFirst: vi.fn() },
            scan: { create: vi.fn() },
        },
        checkRedirectLimit: vi.fn(),
        hasDeepLinkAccess: vi.fn(),
        hasAppDeepLinkAccess: vi.fn(),
    }),
);

vi.mock(import("../src/config"), () => ({ config: {}, prisma }));
/* getCache always misses so every request takes the database branch, which is
   the one the fixtures below describe. */
vi.mock(import("../src/utils/cache"), () => ({
    getCache: async () => null,
    setCache: async () => undefined,
    deleteCache: async () => undefined,
    linkCacheKey: (host: string, shortId: string) => `link:${host}:${shortId}`,
}));
vi.mock(import("../src/utils/geoIp"), () => ({ getLocation: async () => null }));
vi.mock(import("../src/features/billing/billing.service"), () => ({
    checkRedirectLimit,
    hasDeepLinkAccess,
    hasAppDeepLinkAccess,
}));
/* Every supertest request shares one IP, so the real per-IP redirect limiter
   would answer 429 long before the routing logic is exercised. */
vi.mock(import("../src/middleware/rateLimit.middleware"), () => ({
    redirectLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
    unlockLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { default: redirectRouter } = await import("../src/features/redirect/redirect.routes");

const app = express();
app.use(redirectRouter);

const DEFAULT_HOST = "go.linkshift.in";
const TAGGED_DESTINATION = "https://example.com/base?utm_source=instagram&utm_medium=social";

/** A stored link exactly as link.service.createLink leaves it: utm_* columns plus
    the tags already baked into targetUrl by buildUtmUrl. */
function storedLink(overrides: Record<string, unknown> = {}, domainHost = DEFAULT_HOST) {
    prisma.link.findFirst.mockResolvedValue({
        id: "link-1",
        userId: "user-1",
        shortId: "krish",
        targetUrl: TAGGED_DESTINATION,
        isActive: true,
        expiresAt: null,
        passwordHash: null,
        deepLink: true,
        appDeepLink: false,
        appScheme: null,
        androidPackage: null,
        appPath: null,
        iosStoreUrl: null,
        androidStoreUrl: null,
        utmSource: "instagram",
        utmMedium: "social",
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        domainId: "d1",
        domain: { id: "d1", host: domainHost, verified: true },
        ...overrides,
    });
}

async function visit(path: string, host = DEFAULT_HOST): Promise<request.Response> {
    return request(app).get(path).set("Host", host);
}

async function locationOf(pending: Promise<request.Response>): Promise<URL> {
    const res = await pending;
    expect(res.status).toBe(302);
    expect(typeof res.headers.location).toBe("string");
    return new URL(res.headers.location!);
}

beforeEach(() => {
    vi.clearAllMocks();
    checkRedirectLimit.mockResolvedValue(undefined);
    hasDeepLinkAccess.mockResolvedValue(true);
    hasAppDeepLinkAccess.mockResolvedValue(false);
    prisma.scan.create.mockResolvedValue({});
});

describe("redirect: a UTM-tagged link still resolves to a clean short URL", () => {
    it("sends a plain visit to the destination with the configured tags, nothing appended", async () => {
        storedLink();
        const url = await locationOf(visit("/krish"));

        expect(url.origin + url.pathname).toBe("https://example.com/base");
        expect(url.searchParams.get("utm_source")).toBe("instagram");
        expect(url.searchParams.get("utm_medium")).toBe("social");
        /* Nothing is invented on the way out. */
        expect([...url.searchParams.keys()]).toEqual(["utm_source", "utm_medium"]);
    });
});

describe("redirect: visitor-supplied path and query forwarding", () => {
    it("forwards an appended path", async () => {
        storedLink();
        const url = await locationOf(visit("/krish/products/123"));

        expect(url.pathname).toBe("/base/products/123");
    });

    it("forwards an appended query string", async () => {
        storedLink();
        const url = await locationOf(visit("/krish?ref=instagram"));

        expect(url.pathname).toBe("/base");
        expect(url.searchParams.get("ref")).toBe("instagram");
    });

    it("forwards the documented example: path and query together", async () => {
        storedLink();
        const res = visit("/krish/products/123?ref=instagram");

        expect((await locationOf(res)).toString()).toBe(
            "https://example.com/base/products/123?utm_source=instagram&utm_medium=social&ref=instagram",
        );
    });

    it("keeps nested segments and the destination host intact", async () => {
        storedLink();
        const url = await locationOf(visit("/krish/a/b/c?x=1&y=2&z=3"));

        expect(url.pathname).toBe("/base/a/b/c");
        expect(url.origin).toBe("https://example.com");
        expect(["1", "2", "3"]).toEqual(["x", "y", "z"].map((k) => url.searchParams.get(k)));
    });

    it("preserves percent-encoded visitor values instead of mangling them", async () => {
        storedLink();
        const url = await locationOf(visit("/krish?next=https%3A%2F%2Fpartner.example%2Fdeep%2Fpath"));

        expect(url.searchParams.get("next")).toBe("https://partner.example/deep/path");
    });
});

describe("redirect: configured UTM tags and visitor query on the same request", () => {
    it("carries both sets - the visitor's tail is appended, not substituted", async () => {
        storedLink();
        const url = await locationOf(visit("/krish/products/123?ref=campaign"));

        expect(url.searchParams.get("utm_source")).toBe("instagram");
        expect(url.searchParams.get("utm_medium")).toBe("social");
        expect(url.searchParams.get("ref")).toBe("campaign");
    });

    it("never drops visitor parameters, whatever keys they use", async () => {
        storedLink();
        const url = await locationOf(visit("/krish?ref=a&ref=b&empty=&campaignId=42"));

        expect(url.searchParams.getAll("ref")).toEqual(["a", "b"]);
        expect(url.searchParams.get("empty")).toBe("");
        expect(url.searchParams.get("campaignId")).toBe("42");
    });

    it("keeps both sides when a visitor types a utm_* key of their own", async () => {
        storedLink();
        const url = await locationOf(visit("/krish?utm_source=visitor-picked"));

        /* Documented behaviour is verbatim forwarding: the configured tag is not
           overwritten and the visitor's value is not discarded - both survive.
           A refactor must not quietly switch to last-wins or first-wins. */
        expect(url.searchParams.getAll("utm_source")).toEqual(["instagram", "visitor-picked"]);
        expect(url.searchParams.get("utm_medium")).toBe("social");
    });

    it("does not let a visitor query move the destination off its own host", async () => {
        storedLink();
        const url = await locationOf(visit("/krish?next=//attacker.example"));

        expect(url.origin).toBe("https://example.com");
        expect(url.searchParams.get("next")).toBe("//attacker.example");
    });
});

describe("redirect: forwarding is the toggle's job, not the short URL's", () => {
    it("drops the appended tail when the link has path forwarding switched off", async () => {
        storedLink({ deepLink: false });
        const res = visit("/krish/products/123?ref=campaign");

        expect((await locationOf(res)).toString()).toBe(TAGGED_DESTINATION);
    });

    it("stops forwarding when the owner's plan no longer includes it, tags intact", async () => {
        storedLink();
        hasDeepLinkAccess.mockResolvedValue(false);
        const res = visit("/krish/products/123?ref=campaign");

        expect((await locationOf(res)).toString()).toBe(TAGGED_DESTINATION);
    });

    it("adds nothing to the appended tail when no tags are configured", async () => {
        storedLink({ targetUrl: "https://example.com/base", utmSource: null, utmMedium: null });
        const res = visit("/krish/products/123?ref=campaign");

        expect((await locationOf(res)).toString()).toBe(
            "https://example.com/base/products/123?ref=campaign",
        );
    });
});

describe("redirect: custom-domain links behave identically", () => {
    it("forwards path, query and tags the same way on the owner's own domain", async () => {
        storedLink({}, "links.acme.com");
        const res = visit("/krish/products/123?ref=campaign", "links.acme.com");

        expect((await locationOf(res)).toString()).toBe(
            "https://example.com/base/products/123?utm_source=instagram&utm_medium=social&ref=campaign",
        );
    });
});


