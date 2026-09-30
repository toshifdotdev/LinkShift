import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
    prisma: {
        subscription: { findFirst: vi.fn() },
        plan: { findUnique: vi.fn(), findMany: vi.fn() },
        scan: { count: vi.fn() },
        link: { count: vi.fn() },
        linkChange: { count: vi.fn() },
        qr: { count: vi.fn() },
        domain: { count: vi.fn() },
    },
}));

const {
    scanCreate,
    geoLocation,
    storageIpFn,
} = vi.hoisted(() => ({
    scanCreate: vi.fn(),
    geoLocation: vi.fn(),
    storageIpFn: vi.fn((ip?: string) => ip ?? null),
}));

vi.mock(import("../src/config"), () => ({
    prisma,
    config: { razorpayKeyId: "rzp_test_key", razorpayWebhookSecret: "whsec_test" },
}));
vi.mock(import("../src/config/razorpay"), () => ({
    default: { subscriptions: { create: vi.fn(), cancel: vi.fn() } },
}));

import { checkRedirectLimit } from "../src/features/billing/billing.service";

const FREE_PLAN = {
    id: "plan-FREE",
    name: "FREE",
    maxLinks: 100,
    maxQrPerMonth: 10,
    maxDomains: 0,
    maxRedirectsPerMonth: 10_000,
    maxRedirectsWithGracePerMonth: 15_000,
    maxCustomSlugsPerMonth: 10,
    maxDestinationChangesPerMonth: 3,
    analyticsDays: 30,
};

beforeEach(() => {
    vi.clearAllMocks();
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
    prisma.scan.count.mockResolvedValue(0);
});

describe("redirect quota excludes bot traffic", () => {
    it("counts only human clicks", async () => {
        await checkRedirectLimit("user-1");

        expect(prisma.scan.count).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ isBot: false }) }),
        );
    });

    it("allows a FREE account at 10,000 human clicks", async () => {
        prisma.scan.count.mockResolvedValue(9_999);

        await expect(checkRedirectLimit("user-1")).resolves.toMatchObject({
            allowed: true,
            warning: false,
            used: 9_999,
            limit: 10_000,
        });
    });

    it("enters the grace band rather than cutting the link off", async () => {
        
        prisma.scan.count.mockResolvedValue(12_000);

        await expect(checkRedirectLimit("user-1")).resolves.toMatchObject({
            allowed: true,
            warning: true,
            limit: 10_000,
            graceLimit: 15_000,
        });
    });

    it("still blocks beyond the 15,000 grace ceiling", async () => {
        prisma.scan.count.mockResolvedValue(15_000);

        await expect(checkRedirectLimit("user-1")).rejects.toMatchObject({
            statusCode: 429,
        });
    });
});

describe("the redirect write path stores the verdict", () => {
    vi.resetModules();
    vi.doMock(import("../src/config"), () => ({
        prisma: { scan: { create: scanCreate } },
    }));
    vi.doMock(import("../src/features/redirect/visitor.service"), () => ({
        extractVisitorInfo: (req: { headers: Record<string, string>; ip?: string }) => ({
            device: "mobile",
            browser: "Chrome",
            os: "iOS",
            ipAddress: req.ip,
            referrer: undefined,
        }),
    }));
    vi.doMock(import("../src/utils/geoIp"), () => ({ getLocation: geoLocation }));
    vi.doMock(import("../src/utils/ipPrivacy"), () => ({ storageIp: storageIpFn }));

    const link = {
        id: "link-1",
        userId: "user-1",
        targetUrl: "https://example.com",
        shortId: "abc",
        isActive: true,
        expiresAt: null,
        deepLink: false,
        appDeepLink: false,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
    };

    const run = async (userAgent: string | undefined, ip?: string) => {
        const { completeTargetUrl: impl } = await import(
            "../src/utils/completeRedirect"
        );
        const headers: Record<string, string> = {};
        if (userAgent !== undefined) headers["user-agent"] = userAgent;
        return impl(link as never, { headers, ip } as never);
    };

    beforeEach(() => {
        scanCreate.mockReset().mockResolvedValue({});
        geoLocation.mockReset().mockResolvedValue(undefined);
    });

    it("records a chat link preview as a bot, with a reason", async () => {
        await run("Slackbot-LinkExpanding 1.0", "93.184.216.34");

        expect(scanCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                isBot: true,
                botReason: "social-preview",
            }),
        });
    });

    it("records an ordinary browser click as human with no reason", async () => {
        await run(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "93.184.216.34",
        );

        expect(scanCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ isBot: false, botReason: null }),
        });
    });

    it("records a missing User-Agent as a bot with an explicit reason", async () => {
        await run(undefined, "93.184.216.34");

        expect(scanCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                isBot: true,
                botReason: "no-user-agent",
            }),
        });
    });

    it("records an internal address as a bot regardless of User-Agent", async () => {
        await run(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36",
            "169.254.169.254",
        );

        expect(scanCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                isBot: true,
                botReason: "non-public-ip",
            }),
        });
    });

    it("still returns the destination so the link keeps redirecting", async () => {
        
        const result = await run("Slackbot-LinkExpanding 1.0", "93.184.216.34");

        expect(result).toMatchObject({ targetUrl: "https://example.com" });
    });
});

describe("historical scan data stays valid", () => {
    it("defaults new rows to human so pre-existing clicks are preserved", async () => {
        const schema = require("node:fs").readFileSync(
            require("node:path").resolve(__dirname, "../prisma/schema.prisma"),
            "utf8",
        );

        
        expect(schema).toMatch(/isBot\s+Boolean\s+@default\(false\)/);
    });

    it("does not backfill or delete existing rows in the migration", async () => {
        const migration = require("node:fs").readFileSync(
            require("node:path").resolve(
                __dirname,
                "../prisma/migrations/20260930150000_scan_bot_classification/migration.sql",
            ),
            "utf8",
        );

        
        
        expect(migration).not.toMatch(/UPDATE\s+"Scan"/i);
        expect(migration).not.toMatch(/DELETE/i);
        expect(migration).toMatch(/ADD COLUMN\s+"isBot" BOOLEAN NOT NULL DEFAULT false/i);
    });
});
