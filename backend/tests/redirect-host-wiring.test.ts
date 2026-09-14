import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Wiring-level proof for the redirect-host crawler protection.
//
// The unit tests in crawler-protection.test.ts prove the middleware logic.
// This suite proves the middleware is actually MOUNTED on the app, in the
// right order, and that the guard does not hijack unrelated routes.
//
// Hermetic: the full app graph is imported (same cold-import convention as
// tests/reconciliation-auth.test.ts) but no test depends on a database or
// Redis being reachable. Cases that pass param validation are asserted on
// their CONTENT-TYPE and headers only — never on a status code that requires a
// live lookup — so the suite behaves identically in CI and locally.
// ---------------------------------------------------------------------------

process.env.RAZORPAY_KEY_ID ??= "rzp_test_placeholder";
process.env.RAZORPAY_KEY_SECRET ??= "placeholder_secret";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "whsec_placeholder";
process.env.RESEND_API_KEY ??= "re_placeholder";
process.env.JWT_SECRET ??= "test-jwt-secret";

const REDIRECT_HOST_HEADER = "go.linkshift.in";
const ROBOTS_BODY = "User-agent: *\nDisallow: /\n";

// The app graph cold-imports slowly on modest machines.
const { app } = await import("../src/app");

describe("GET /robots.txt on the short-link host", () => {
    it("disallows everything", async () => {
        const res = await request(app).get("/robots.txt").set("Host", REDIRECT_HOST_HEADER);

        expect(res.status).toBe(200);
        expect(res.text).toBe(ROBOTS_BODY);
    });

    it("is served as text/plain so crawlers parse it as robots.txt", async () => {
        const res = await request(app).get("/robots.txt").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["content-type"]).toContain("text/plain");
    });

    it("is cached, unlike the redirect responses", async () => {
        const res = await request(app).get("/robots.txt").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["cache-control"]).toContain("max-age");
    });

    it("also protects a custom short domain", async () => {
        const res = await request(app).get("/robots.txt").set("Host", "links.acme.com");

        expect(res.status).toBe(200);
        expect(res.text).toBe(ROBOTS_BODY);
    });

    it("falls through on the marketing host", async () => {
        // linkshift.in's robots.txt is a static CloudFront asset. In a
        // dev/preview proxy both hosts can reach this process, so this route
        // must NOT answer for the marketing host. It falls through, and with
        // no static host in front of the app the request continues into the
        // redirect router (where "/robots.txt" is not a 7-char short id) — the
        // point is that no disallow-all body is produced here.
        const res = await request(app).get("/robots.txt").set("Host", "linkshift.in");

        expect(res.text).not.toBe(ROBOTS_BODY);
        expect(res.headers["content-type"]).not.toContain("text/plain");
    });
});

describe("X-Robots-Tag on the short-link host", () => {
    it("is present on the robots.txt response", async () => {
        const res = await request(app).get("/robots.txt").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    });

    it("is present on a validation-failure (400) path", async () => {
        // A 2-char short id fails the 7-char param schema before any lookup,
        // so this path is fully deterministic.
        const res = await request(app).get("/no").set("Host", REDIRECT_HOST_HEADER);

        expect(res.status).toBe(400);
        expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    });

    it("is present on a well-formed short-id request", async () => {
        // 7 chars passes param validation, so the request reaches the redirect
        // pipeline. The status depends on infrastructure, so only the header
        // is asserted — the point is that the guard survives that far.
        const res = await request(app).get("/abc1234").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    });

    it("is present on the health endpoint", async () => {
        const res = await request(app).get("/health").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    });

    it("is absent on the marketing host", async () => {
        const res = await request(app).get("/robots.txt").set("Host", "linkshift.in");

        expect(res.headers["x-robots-tag"]).toBeUndefined();
    });

    it("is absent for www.linkshift.in", async () => {
        const res = await request(app).get("/health").set("Host", "www.linkshift.in");

        expect(res.headers["x-robots-tag"]).toBeUndefined();
    });
});

describe("redirect behaviour is unchanged by the crawler guard", () => {
    it("still rejects a malformed short id with 400", async () => {
        const res = await request(app).get("/no").set("Host", REDIRECT_HOST_HEADER);

        expect(res.status).toBe(400);
    });

    it("still rejects an over-long short id with 400", async () => {
        const res = await request(app).get("/robots.txtx").set("Host", REDIRECT_HOST_HEADER);

        // 8 chars → param schema rejects it, exactly as before this change.
        expect(res.status).toBe(400);
    });

    it("does not serve the robots body for a well-formed short id", async () => {
        const res = await request(app).get("/abcdefg").set("Host", REDIRECT_HOST_HEADER);

        expect(res.text).not.toBe(ROBOTS_BODY);
        expect(res.headers["content-type"]).not.toContain("text/plain");
    });

    it("keeps the /health contract intact", async () => {
        const res = await request(app).get("/health").set("Host", REDIRECT_HOST_HEADER);

        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty("status");
        expect(res.body).toHaveProperty("checks");
    });

    it("keeps API routes reachable on the redirect host", async () => {
        // The crawler guard must not intercept /api/* traffic.
        const res = await request(app).get("/api/v1/links").set("Host", REDIRECT_HOST_HEADER);

        expect(res.headers["content-type"]).toContain("application/json");
        expect(res.text).not.toBe(ROBOTS_BODY);
    });

    it("keeps the webhook route reachable", async () => {
        // Billing webhooks are raw-body and must not be disturbed.
        const res = await request(app)
            .post("/api/v1/billing/webhook")
            .set("Host", REDIRECT_HOST_HEADER)
            .set("Content-Type", "application/json")
            .send("{}");

        expect(res.status).not.toBe(404);
        expect(res.text).not.toBe(ROBOTS_BODY);
    });
});

afterAll(() => {
    vi.restoreAllMocks();
});
