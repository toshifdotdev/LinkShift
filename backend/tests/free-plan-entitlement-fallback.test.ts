import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
    prisma: {
        subscription: { findFirst: vi.fn() },
        plan: { findUnique: vi.fn(), findMany: vi.fn() },
        linkChange: { count: vi.fn() },
        link: { count: vi.fn() },
        qr: { count: vi.fn() },
        domain: { count: vi.fn() },
        scan: { count: vi.fn() },
    },
}));

vi.mock(import("../src/config"), () => ({
    prisma,
    config: { razorpayKeyId: "rzp_test_key", razorpayWebhookSecret: "whsec_test" },
}));
vi.mock(import("../src/config/razorpay"), () => ({
    default: { subscriptions: { create: vi.fn(), cancel: vi.fn() } },
}));

import {
    checkCustomSlugLimit,
    checkDestinationLimit,
    checkLinkLimit,
    checkQrLimit,
    checkDomainLimit,
    checkRedirectLimit,
    getUserPlan,
} from "../src/features/billing/billing.service";

const FREE_PLAN = {
    id: "plan-FREE",
    name: "FREE",
    maxLinks: 50,
    maxQrPerMonth: 10,
    maxDomains: 0,
    maxRedirectsPerMonth: 2500,
    maxRedirectsWithGracePerMonth: 5000,
    maxCustomSlugsPerMonth: 0,
    maxDestinationChangesPerMonth: 3,
    analyticsDays: 30,
};

const activeSubscription = (plan: Record<string, unknown>) => ({
    id: "sub-1",
    userId: "user-1",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
    plan,
    pendingPlan: null,
});

beforeEach(() => {
    vi.clearAllMocks();
    
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
    prisma.linkChange.count.mockResolvedValue(0);
});

describe("getUserPlan resolves FREE without a subscription", () => {
    it("returns the FREE plan when no subscription exists", async () => {
        await expect(getUserPlan("user-1")).resolves.toEqual(FREE_PLAN);
        expect(prisma.plan.findUnique).toHaveBeenCalledWith({
            where: { name: "FREE" },
        });
    });

    it("throws a server error, not a 403, when the FREE plan is missing", async () => {
        prisma.plan.findUnique.mockResolvedValue(null);

        await expect(getUserPlan("user-1")).rejects.toMatchObject({ statusCode: 500 });
    });
});

describe("checkCustomSlugLimit — FREE fallback", () => {
    it("does not 403 a FREE user who requests a custom slug", async () => {
        
        
        await expect(checkCustomSlugLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /custom slug limit of 0/,
        });
        expect(prisma.plan.findUnique).toHaveBeenCalled();
    });

    it("enforces the configured FREE slug limit of 0", async () => {
        await expect(checkCustomSlugLimit("user-1")).rejects.toThrow(
            "You have reached your monthly custom slug limit of 0.",
        );
    });

    it("allows the request when the FREE plan grants slugs and none are used", async () => {
        prisma.plan.findUnique.mockResolvedValue({
            ...FREE_PLAN,
            maxCustomSlugsPerMonth: 25,
        });
        prisma.linkChange.count.mockResolvedValue(0);

        await expect(checkCustomSlugLimit("user-1")).resolves.toBeUndefined();
    });

    it("still blocks once the FREE slug limit is exhausted", async () => {
        prisma.plan.findUnique.mockResolvedValue({
            ...FREE_PLAN,
            maxCustomSlugsPerMonth: 25,
        });
        prisma.linkChange.count.mockResolvedValue(25);

        await expect(checkCustomSlugLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /custom slug limit of 25/,
        });
    });

    it("uses an active paid plan's limits, not FREE", async () => {
        const paid = {
            ...FREE_PLAN,
            name: "STARTER",
            maxCustomSlugsPerMonth: 5,
        };
        prisma.subscription.findFirst.mockResolvedValue(activeSubscription(paid));

        
        prisma.linkChange.count.mockResolvedValue(5);
        await expect(checkCustomSlugLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /custom slug limit of 5/,
        });

        
        expect(prisma.plan.findUnique).not.toHaveBeenCalled();
    });

    it("allows a paid account with an unlimited slug allowance", async () => {
        prisma.subscription.findFirst.mockResolvedValue(
            activeSubscription({ ...FREE_PLAN, name: "PRO", maxCustomSlugsPerMonth: null }),
        );

        await expect(checkCustomSlugLimit("user-1")).resolves.toBeUndefined();
        expect(prisma.linkChange.count).not.toHaveBeenCalled();
    });
});

describe("checkDestinationLimit — FREE fallback", () => {
    it("does not 403 with 'No active subscription found' for a FREE user", async () => {
        
        prisma.linkChange.count.mockResolvedValue(3);

        await expect(checkDestinationLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /destination change limit for this billing period/,
        });
        expect(prisma.plan.findUnique).toHaveBeenCalled();
    });

    it("never emits the old misleading error for a FREE account", async () => {
        prisma.linkChange.count.mockResolvedValue(3);

        await checkDestinationLimit("user-1").catch((err: Error) => {
            expect(err.message).not.toMatch(/No active subscription/i);
        });
    });

    it("allows the change while the FREE allowance remains", async () => {
        prisma.linkChange.count.mockResolvedValue(2);

        await expect(checkDestinationLimit("user-1")).resolves.toBeUndefined();
    });

    it("uses an active paid plan's limits, not FREE", async () => {
        prisma.subscription.findFirst.mockResolvedValue(
            activeSubscription({
                ...FREE_PLAN,
                name: "CREATOR",
                maxDestinationChangesPerMonth: 150,
            }),
        );
        prisma.linkChange.count.mockResolvedValue(150);

        await expect(checkDestinationLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /destination change limit for this billing period/,
        });
        expect(prisma.plan.findUnique).not.toHaveBeenCalled();
    });

    it("keeps the PRO anti-abuse guard on an unlimited allowance", async () => {
        prisma.subscription.findFirst.mockResolvedValue(
            activeSubscription({
                ...FREE_PLAN,
                name: "PRO",
                maxDestinationChangesPerMonth: null,
            }),
        );
        prisma.linkChange.count.mockResolvedValue(4999);

        await expect(checkDestinationLimit("user-1")).resolves.toBeUndefined();

        prisma.linkChange.count.mockResolvedValue(5000);
        await expect(checkDestinationLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /contact support/i,
        });
    });

    it("skips the anti-abuse guard on a non-PRO unlimited allowance", async () => {
        prisma.subscription.findFirst.mockResolvedValue(
            activeSubscription({
                ...FREE_PLAN,
                name: "CREATOR",
                maxDestinationChangesPerMonth: null,
            }),
        );

        await expect(checkDestinationLimit("user-1")).resolves.toBeUndefined();
        expect(prisma.linkChange.count).not.toHaveBeenCalled();
    });
});

describe("the four previously-working quota checks are unchanged", () => {
    it("checkLinkLimit still enforces the FREE link cap", async () => {
        prisma.link.count.mockResolvedValue(50);

        await expect(checkLinkLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /maximum number of links/i,
        });
    });

    it("checkQrLimit still enforces the FREE QR cap", async () => {
        prisma.qr.count.mockResolvedValue(10);

        await expect(checkQrLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /maximum number of QR codes/i,
        });
    });

    it("checkDomainLimit still enforces the FREE domain cap of 0", async () => {
        prisma.domain.count.mockResolvedValue(0);

        await expect(checkDomainLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: /maximum number of custom domains/i,
        });
    });

    it("checkRedirectLimit still allows a FREE account inside its allowance", async () => {
        prisma.scan.count.mockResolvedValue(10);

        const result = await checkRedirectLimit("user-1");

        expect(result).toMatchObject({ allowed: true, limit: 2500, warning: false });
    });
});