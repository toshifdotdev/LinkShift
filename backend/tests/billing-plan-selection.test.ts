import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Plan/currency selection safety (hermetic): the checkout must map
// INR/USD × MONTHLY/YEARLY onto the correct provider plan-id column for
// Starter/Creator/Pro, refuse to start when the currency's plan id is not
// configured (fail closed), and never allow a second live subscription.
// ---------------------------------------------------------------------------

const { prisma, subscriptionsCreate, subscriptionsCancel } = vi.hoisted(() => {
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    return {
        prisma: {
            subscription: { findFirst: vi.fn(), create: vi.fn() },
            plan: { findUnique: vi.fn() },
        },
        subscriptionsCreate: vi.fn(),
        subscriptionsCancel: vi.fn(),
    };
});

vi.mock(import("../src/config"), () => ({
    config: { razorpayKeyId: "rzp_test_key" },
    prisma,
}));
vi.mock(import("../src/config/razorpay"), () => ({
    default: { subscriptions: { create: subscriptionsCreate, cancel: subscriptionsCancel } },
}));

import { subscriptionService } from "../src/features/billing/billing.service";

function planWithIds(name: string, ids: {
    inrM: string | null;
    inrY: string | null;
    usdM: string | null;
    usdY: string | null;
}) {
    return {
        id: `plan-${name}`,
        name,
        razorpayMonthlyPlanId: ids.inrM,
        razorpayYearlyPlanId: ids.inrY,
        razorpayUsdMonthlyPlanId: ids.usdM,
        razorpayUsdYearlyPlanId: ids.usdY,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    prisma.subscription.findFirst.mockResolvedValue(null); // no live subscription
    prisma.subscription.create.mockResolvedValue({ id: "local-sub-1" });
    subscriptionsCreate.mockResolvedValue({
        id: "sub_provider_1",
        short_url: "https://api.razorpay.com/v1/checkout/sub_1",
    });
});

describe("subscriptionService plan-id selection", () => {
    const cases = [
        ["INR", "MONTHLY", "inrM", "plan_INR_M"],
        ["INR", "YEARLY", "inrY", "plan_INR_Y"],
        ["USD", "MONTHLY", "usdM", "plan_USD_M"],
        ["USD", "YEARLY", "usdY", "plan_USD_Y"],
    ] as const;

    for (const [currency, cycle, key, planId] of cases) {
        it(`maps ${currency} ${cycle} onto the ${key} provider plan id`, async () => {
            for (const plan of ["STARTER", "CREATOR", "PRO"]) {
                vi.clearAllMocks();
                prisma.subscription.findFirst.mockResolvedValue(null);
                prisma.subscription.create.mockResolvedValue({ id: "local-sub-1" });
                subscriptionsCreate.mockResolvedValue({
                    id: "sub_provider_1",
                    short_url: "https://x",
                });
                prisma.plan.findUnique.mockResolvedValue(
                    planWithIds(plan, { inrM: "plan_INR_M", inrY: "plan_INR_Y", usdM: "plan_USD_M", usdY: "plan_USD_Y" }),
                );

                const result = await subscriptionService("user-1", plan as never, cycle as never, currency as never);

                expect(subscriptionsCreate).toHaveBeenCalledWith(
                    expect.objectContaining({ plan_id: planId, quantity: 1 }),
                );
                expect(result.currency).toBe(currency);
                expect(result.billingCycle).toBe(cycle);
                expect(typeof result.keyId).toBe("string"); // key id travels to Checkout
            }
        });
    }

    it("refuses to start a subscription when the currency's plan id is unconfigured", async () => {
        // USD yearly not configured in the dashboard yet — must fail closed.
        prisma.plan.findUnique.mockResolvedValue(
            planWithIds("STARTER", { inrM: "plan_INR_M", inrY: "plan_INR_Y", usdM: null, usdY: null }),
        );

        await expect(
            subscriptionService("user-1", "STARTER", "YEARLY", "USD"),
        ).rejects.toMatchObject({
            statusCode: 500,
            message: "USDRazorpay plan is not configured",
        });
        expect(subscriptionsCreate).not.toHaveBeenCalled();
        expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it("never creates a second live subscription", async () => {
        prisma.subscription.findFirst.mockResolvedValue({ id: "existing", status: "ACTIVE" });

        await expect(
            subscriptionService("user-1", "STARTER", "MONTHLY", "INR"),
        ).rejects.toMatchObject({ statusCode: 409 });
        expect(subscriptionsCreate).not.toHaveBeenCalled();
        expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it("cleans up the orphaned provider subscription if the local insert loses a race", async () => {
        const { Prisma } = await import("../src/generated/prisma/client");
        prisma.plan.findUnique.mockResolvedValue(
            planWithIds("STARTER", { inrM: "plan_INR_M", inrY: "plan_INR_Y", usdM: "plan_USD_M", usdY: "plan_USD_Y" }),
        );
        prisma.subscription.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002",
                clientVersion: "test",
            }),
        );
        subscriptionsCancel.mockResolvedValue({});

        await expect(
            subscriptionService("user-1", "STARTER", "MONTHLY", "INR"),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(subscriptionsCreate).toHaveBeenCalledTimes(1);
        // The provider-side subscription was cancelled so no orphan can later
        // activate and bill the customer without a local row.
        expect(subscriptionsCancel).toHaveBeenCalledWith("sub_provider_1");
    });
});
