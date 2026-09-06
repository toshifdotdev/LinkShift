import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Regression suite: password-protected links must preserve the visitor's
// appended path/query through the unlock round trip, for BOTH path
// forwarding and mobile app deep linking — without weakening auth.
// Touches the shared development database.
// Enable explicitly:  RUN_INTEGRATION=1 npx vitest run
// ---------------------------------------------------------------------------

const RUN = !!process.env.RUN_INTEGRATION;

vi.mock(import("../../src/utils/email"), () => ({
    sendVerificationEmail: async () => ({ delivered: true }),
    sendPasswordResetEmail: async () => ({ delivered: true }),
    resend: {},
}));

/* The redirect/unlock limiters are per-IP (5/15min on unlock) and would trip
   immediately under supertest where every request shares one IP. The real
   limiters stay in production; tests assert auth behavior, not throttling. */
vi.mock(import("../../src/middleware/rateLimit.middleware"), async (importOriginal) => {
    const actual = await importOriginal();
    const pass = (_req: unknown, _res: unknown, next: () => void) => next();
    return { ...actual, unlockLimiter: pass, redirectLimiter: pass };
});

import { app } from "../../src/app";
import { prisma } from "../../src/config";

/* Distinct domain (not a suffix of api.test.ts's "test.linkshift.in") so the
   parallel suites cannot trample each other's fixtures during cleanup. */
const EMAIL_DOMAIN = "unlock.linkshift.test";
const OWNER_PASSWORD = "Str0ng!Passw0rd";
const LINK_PASSWORD = "Unlock!Pass123";

const UA_DESKTOP =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const UA_ANDROID_CHROME =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const UA_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const createdEmails: string[] = [];

async function createVerifiedUser(): Promise<{ userId: string; email: string; token: string }> {
    const email = `it${Date.now()}${Math.floor(Math.random() * 100000)}@${EMAIL_DOMAIN}`;
    await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "UnlockFlow", email, password: OWNER_PASSWORD })
        .expect(201);

    const user = await prisma.user.update({
        where: { email },
        data: { verified: true },
    });
    createdEmails.push(email);

    const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password: OWNER_PASSWORD })
        .expect(200);

    return { userId: user.id, email, token: login.body.accessToken };
}

describe.skipIf(!RUN)("Unlock flow: password + appended path/query", () => {
    let defaultDomainId: string;

    let freeUser: { userId: string; token: string };
    let proUser: { userId: string; token: string };

    /* L1 — plain password link (no Pro features), FREE owner */
    let plainSlug: string;
    /* L2 — password + path forwarding, PRO owner */
    let fwdSlug: string;
    let fwdLinkId: string;
    /* L3 — password + path forwarding + app deep linking, PRO owner */
    let appSlug: string;
    let appLinkId: string;
    /* L4 — like L3 without store URLs, PRO owner */
    let noStoreSlug: string;

    const visit = (path: string) =>
        request(app).get(path).set("Host", "go.linkshift.in").set("User-Agent", UA_DESKTOP);

    beforeAll(async () => {
        const domain = await prisma.domain.findUnique({ where: { host: "go.linkshift.in" } });
        if (!domain) throw new Error("Seed missing: go.linkshift.in");
        defaultDomainId = domain.id;

        const proPlan = await prisma.plan.findUnique({ where: { name: "PRO" } });
        if (!proPlan) throw new Error("Seed missing: PRO plan");

        const free = await createVerifiedUser();
        freeUser = { userId: free.userId, token: free.token };

        const pro = await createVerifiedUser();
        await prisma.subscription.create({
            data: { userId: pro.userId, planId: proPlan.id, status: "ACTIVE", billingCycle: "MONTHLY" },
        });
        proUser = { userId: pro.userId, token: pro.token };

        const l1 = await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${freeUser.token}`)
            .send({
                targetUrl: "https://example.com/plain-dest",
                domainId: defaultDomainId,
                password: LINK_PASSWORD,
            })
            .expect(201);
        plainSlug = l1.body.data.shortId;

        const l2 = await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${proUser.token}`)
            .send({
                targetUrl: "https://example.com/base",
                domainId: defaultDomainId,
                password: LINK_PASSWORD,
                deepLink: true,
            })
            .expect(201);
        fwdSlug = l2.body.data.shortId;
        fwdLinkId = l2.body.data.id;

        const l3 = await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${proUser.token}`)
            .send({
                targetUrl: "https://example.com/web",
                domainId: defaultDomainId,
                password: LINK_PASSWORD,
                deepLink: true,
                appDeepLink: true,
                appScheme: "unapp",
                androidPackage: "com.example.unlock",
                appPath: "home",
                iosStoreUrl: "https://apps.apple.com/app/id9",
                androidStoreUrl: "https://play.google.com/store/apps/details?id=com.example.unlock",
            })
            .expect(201);
        appSlug = l3.body.data.shortId;
        appLinkId = l3.body.data.id;

        /* L4 — like L3 but with no store URLs: the intent's browser fallback
           must be the path-forwarded web destination itself. */
        const l4 = await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${proUser.token}`)
            .send({
                targetUrl: "https://example.com/nostore",
                domainId: defaultDomainId,
                password: LINK_PASSWORD,
                deepLink: true,
                appDeepLink: true,
                appScheme: "unapp",
                androidPackage: "com.example.unlock",
            })
            .expect(201);
        noStoreSlug = l4.body.data.shortId;
    });

    afterAll(async () => {
        /* Link.userId FK is RESTRICT — remove scans and links before owners. */
        const links = await prisma.link.findMany({
            where: { user: { email: { in: createdEmails } } },
            select: { id: true },
        });
        const linkIds = links.map((l) => l.id);
        await prisma.scan.deleteMany({ where: { linkId: { in: linkIds } } });
        await prisma.linkChange.deleteMany({ where: { linkId: { in: linkIds } } });
        await prisma.qr.deleteMany({ where: { linkId: { in: linkIds } } });
        await prisma.link.deleteMany({ where: { id: { in: linkIds } } });
        await prisma.subscription.deleteMany({ where: { user: { email: { in: createdEmails } } } });
        await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
        await prisma.$disconnect();
    });

    it("browser GET on a protected link answers 401 with the unlock page (JSON contract intact for API clients)", async () => {
        const html = await visit(`/${plainSlug}`);
        expect(html.status).toBe(401);
        expect(html.headers["content-type"]).toContain("text/html");
        expect(html.text).toContain(`action="/${plainSlug}/unlock"`);
        expect(html.text).toContain("Enter the password");

        const json = await visit(`/${plainSlug}`).set("Accept", "application/json");
        expect(json.status).toBe(401);
        expect(json.body.requiresPassword).toBe(true);
        expect(typeof json.body.linkId).toBe("string");
    });

    it("the unlock page preserves the appended path and query in the form action", async () => {
        const res = await visit(`/${fwdSlug}/products/123?ref=campaign`);
        expect(res.status).toBe(401);
        expect(res.text).toContain(`action="/${fwdSlug}/unlock/products/123?ref=campaign"`);
    });

    it("wrong password still fails (auth not weakened)", async () => {
        const res = await request(app)
            .post(`/${plainSlug}/unlock`)
            .set("Host", "go.linkshift.in")
            .send({ password: "Wrong!Pass123" });
        expect(res.status).toBe(401);
    });

    it("plain protected link unlocks to the bare destination (JSON and form bodies both work)", async () => {
        const json = await request(app)
            .post(`/${plainSlug}/unlock`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_DESKTOP)
            .send({ password: LINK_PASSWORD });
        expect(json.status).toBe(302);
        expect(json.headers.location).toBe("https://example.com/plain-dest");

        const form = await request(app)
            .post(`/${plainSlug}/unlock`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_DESKTOP)
            .type("form")
            .send({ password: LINK_PASSWORD });
        expect(form.status).toBe(302);
        expect(form.headers.location).toBe("https://example.com/plain-dest");
    });

    it("path forwarding survives the unlock round trip (path + query forwarded)", async () => {
        const res = await request(app)
            .post(`/${fwdSlug}/unlock/products/123?ref=campaign`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_DESKTOP)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://example.com/base/products/123?ref=campaign");
    });

    it("unlocked app deep link: Android Chrome gets intent:// carrying path + query", async () => {
        const res = await request(app)
            .post(`/${appSlug}/unlock/products/123?ref=campaign`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_ANDROID_CHROME)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(302);
        const loc: string = res.headers.location;
        expect(loc.startsWith("intent://home/products/123?ref=campaign#Intent;")).toBe(true);
        expect(loc).toContain("scheme=unapp;");
        expect(loc).toContain("package=com.example.unlock;");
        /* With a Play Store URL configured, Chrome's native fallback goes to
           the store (androidStoreUrl ?? webFallback) — same as unlocked-off. */
        expect(loc).toContain(
            `S.browser_fallback_url=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.example.unlock")};end`,
        );
    });

    it("unlocked app deep link: iPhone gets the interstitial with app URL and forwarded web fallback", async () => {
        const res = await request(app)
            .post(`/${appSlug}/unlock/products/123?ref=campaign`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_IPHONE)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/html");
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.text).toContain('"appUrl":"unapp://home/products/123?ref=campaign"');
        expect(res.text).toContain('"fallbackUrl":"https://example.com/web/products/123?ref=campaign"');
        expect(res.text).toContain("Get the app");
    });

    it("unlocked app deep link: desktop goes to the path-forwarded destination", async () => {
        const res = await request(app)
            .post(`/${appSlug}/unlock/products/123?ref=campaign`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_DESKTOP)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://example.com/web/products/123?ref=campaign");
    });

    it("unlocked app deep link without store URLs: intent fallback is the path-forwarded destination", async () => {
        const res = await request(app)
            .post(`/${noStoreSlug}/unlock/deep/path?u=1`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_ANDROID_CHROME)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(302);
        const loc: string = res.headers.location;
        expect(loc.startsWith("intent://deep/path?u=1#Intent;")).toBe(true);
        expect(loc).toContain(
            `S.browser_fallback_url=${encodeURIComponent("https://example.com/nostore/deep/path?u=1")};end`,
        );
    });

    it("analytics: each successful unlock records exactly one scan; 401s and wrong passwords record none", async () => {
        const fwd = await request(app)
            .get(`/api/v1/links/${fwdLinkId}`)
            .set("Authorization", `Bearer ${proUser.token}`)
            .expect(200);
        expect(fwd.body.data.clicks).toBe(1);

        const appLink = await request(app)
            .get(`/api/v1/links/${appLinkId}`)
            .set("Authorization", `Bearer ${proUser.token}`)
            .expect(200);
        expect(appLink.body.data.clicks).toBe(3);
    });

    it("Pro gating on unlock: downgraded owner loses both features, unlock itself still works", async () => {
        await prisma.subscription.deleteMany({ where: { userId: proUser.userId } });

        const res = await request(app)
            .post(`/${appSlug}/unlock/products/123?ref=campaign`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_IPHONE)
            .send({ password: LINK_PASSWORD });
        /* No interstitial, no forwarding — plain destination, link still usable. */
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://example.com/web");
    });

    it("bare unlock without a tail still works (no path appended)", async () => {
        const res = await request(app)
            .post(`/${fwdSlug}/unlock`)
            .set("Host", "go.linkshift.in")
            .set("User-Agent", UA_DESKTOP)
            .send({ password: LINK_PASSWORD });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://example.com/base");
    });
});
