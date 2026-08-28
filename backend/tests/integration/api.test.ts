import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Integration suite — touches the shared development database.
// Enable explicitly:  RUN_INTEGRATION=1 npx vitest run
// ---------------------------------------------------------------------------

const RUN = !!process.env.RUN_INTEGRATION;

// Resolved via the import object so the path is correct from tests/integration/.
vi.mock(import("../../src/utils/email"), () => ({
    // Deterministic: never hit Resend during integration runs.
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    resend: {},
}));

import { app } from "../../src/app";
import { prisma } from "../../src/config";

const EMAIL_DOMAIN = "test.linkshift.in";
const PASSWORD = "Str0ng!Passw0rd";

let createdUserIds: string[] = [];

async function createVerifiedUser(): Promise<{ userId: string; email: string; token: string }> {
    const email = `it${Date.now()}${Math.floor(Math.random() * 100000)}@${EMAIL_DOMAIN}`;
    await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Integration", email, password: PASSWORD })
        .expect(201);

    const user = await prisma.user.update({
        where: { email },
        data: { verified: true },
    });
    createdUserIds.push(user.id);

    const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password: PASSWORD })
        .expect(200);

    return { userId: user.id, email, token: login.body.accessToken };
}

describe.skipIf(!RUN)("Integration API", () => {
    beforeAll(async () => {
        // Sanity: default domain must exist for link creation.
        const domain = await prisma.domain.findUnique({ where: { host: "go.linkshift.in" } });
        if (!domain) throw new Error("Seed missing: go.linkshift.in");
    });

    afterAll(async () => {
        // NOTE: Link.userId FK is RESTRICT (no cascade) — links must be removed
        // before their owner. This is also why the future account-deletion
        // feature (M2) will need explicit link cleanup before user removal.
        await prisma.link.deleteMany({
            where: { user: { email: { endsWith: EMAIL_DOMAIN } } },
        });
        await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
        await prisma.$disconnect();
    });

    it("health reports database up", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.checks.database).toBe("up");
    });

    it("login rejects unknown accounts with the enumeration-neutral 401 (M2 contract)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: `nobody-${Date.now()}@${EMAIL_DOMAIN}`, password: PASSWORD });
        expect(res.status).toBe(401); // M2: generic response, no account-existence leak
        expect(res.body.message).toBe("Invalid email or password.");
    });

    it("register -> verify -> login -> read billing subscription", async () => {
        const { token } = await createVerifiedUser();

        const res = await request(app)
            .get("/api/v1/billing/subscription")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // No subscription yet — FREE entitlement fallback applies elsewhere.
        expect(res.body.subscription).toBeNull();
    });

    it("unauthenticated access is rejected", async () => {
        await request(app).get("/api/v1/billing/subscription").expect(401);
    });

    it("link lifecycle: create -> redirect -> deactivate -> redirect blocked", async () => {
        const { userId, token } = await createVerifiedUser();

        const domain = await prisma.domain.findUniqueOrThrow({
            where: { host: "go.linkshift.in" },
        });
        const slug = `it${Date.now().toString(36)}`;

        // NOTE: no custom slug. FREE is rejected by both layers of
        // checkCustomSlugLimit — the ACTIVE-subscription requirement and the
        // plan's maxCustomSlugsPerMonth=0 quota — so custom slugs are
        // effectively a Starter+ capability.
        const created = await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${token}`)
            .send({
                targetUrl: "https://example.com/?utm_source=integration",
                domainId: domain.id,
            })
            .expect(201);

        const shortId = created.body.data.shortId;
        expect(shortId).toBeTruthy();

        // Redirect #1 — WITH a Referer header (warms the Redis cache).
        const first = await request(app)
            .get(`/r/${shortId}`)
            .set("Host", "go.linkshift.in")
            .set("Referer", "https://news.example.com/article");
        expect(first.status).toBe(302);
        expect(first.headers.location).toContain("example.com");

        // M3: referrer persisted + stored IP privacy-truncated.
        const scan1 = await prisma.scan.findFirstOrThrow({
            where: { linkId: created.body.data.id },
            orderBy: { scannedAt: "desc" },
        });
        expect(scan1.referrer).toBe("https://news.example.com/article");
        expect(scan1.ipAddress).toMatch(/\.0$|:/); // truncated tail or IPv6 prefix

        // Redirect #2 — NO Referer header (still ACTIVE): null-safe scan.
        await request(app)
            .get(`/r/${shortId}`)
            .set("Host", "go.linkshift.in")
            .expect(302);
        const scan2 = await prisma.scan.findFirstOrThrow({
            where: { linkId: created.body.data.id, referrer: null },
            orderBy: { scannedAt: "desc" },
        });
        expect(scan2.referrer).toBeNull();

        // Deactivate, then confirm the cached entry was invalidated.
        await request(app)
            .patch(`/api/v1/links/${created.body.data.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ isActive: false })
            .expect(200);

        const second = await request(app)
            .get(`/r/${shortId}`)
            .set("Host", "go.linkshift.in");
        // /r/* errors render the HTML error branch (non-/api path prefix).
        expect(second.status).toBe(403);
        expect(second.text).toMatch(/disabled/i);

        // Blocked redirects must NOT record scans (403 exits pre-analytics).
        const scansAfterBlock = await prisma.scan.count({
            where: { linkId: created.body.data.id },
        });
        expect(scansAfterBlock).toBe(2);

        void userId;
    });
});
