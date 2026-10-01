import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bulk link import entitlement.
 *
 * The gate is an allowlist of CREATOR and PRO. It has to agree with:
 *
 *   - the Links page, which hides the Import button unless the plan matches
 *   - FLAG_ROWS in the pricing table, which shows the row as Creator + Pro
 *
 * If those three drift, a customer either sees a feature they cannot use or
 * pays for one the pricing page never mentioned. Each plan is asserted
 * explicitly rather than by rank arithmetic, so reordering the plan enum cannot
 * silently change who gets access.
 *
 * `getUserPlan` is module-private, so entitlement is driven through the same
 * data the real service reads: an active subscription's plan, or the seeded
 * FREE row when there is no subscription.
 */

const { prisma } = vi.hoisted(() => ({
  prisma: {
    plan: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    subscription: { findFirst: vi.fn(), findMany: vi.fn() },
    payment: { findFirst: vi.fn(), findMany: vi.fn() },
    link: { count: vi.fn(), findFirst: vi.fn() },
    linkChange: { count: vi.fn() },
    webhookEvent: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../src/config/prisma", () => ({ prisma }));
vi.mock("../src/config/redis", () => ({
  redisClient: { isReady: true },
  connectRedis: vi.fn(),
}));
vi.mock("../src/config/razorpay", () => ({ default: vi.fn() }));

import { checkLinkImportAccess } from "../src/features/billing/billing.service";

/** Give the user an active subscription on `planName`. */
const onPlan = (planName: string) => {
  prisma.subscription.findFirst.mockResolvedValue({
    id: "sub-1",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
    plan: { name: planName },
  });
};

/** No subscription at all: the service falls back to the seeded FREE row. */
const onFreeFallback = () => {
  prisma.subscription.findFirst.mockResolvedValue(null);
  prisma.plan.findUnique.mockResolvedValue({ name: "FREE" });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkLinkImportAccess", () => {
  it("blocks Free", async () => {
    onFreeFallback();

    await expect(checkLinkImportAccess("u1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("blocks Starter", async () => {
    // Starter allows 1,000 links, which is still not enough for a file import
    // to earn the cost of a transaction, so it is deliberately excluded.
    onPlan("STARTER");

    await expect(checkLinkImportAccess("u1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("allows Creator", async () => {
    onPlan("CREATOR");

    await expect(checkLinkImportAccess("u1")).resolves.toBeUndefined();
  });

  it("allows Pro", async () => {
    onPlan("PRO");

    await expect(checkLinkImportAccess("u1")).resolves.toBeUndefined();
  });

  it("names both plans in the rejection so the upgrade is actionable", async () => {
    onPlan("STARTER");

    await expect(checkLinkImportAccess("u1")).rejects.toThrow(/Creator and Pro/i);
  });

  it("refuses ENTERPRISE, which is in the enum but never seeded", async () => {
    // Asserting this documents that the allowlist is deliberate rather than
    // rank-based, so seeding Enterprise later becomes a conscious decision.
    onPlan("ENTERPRISE");

    await expect(checkLinkImportAccess("u1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("surfaces a misconfigured deployment rather than granting access", async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(checkLinkImportAccess("u1")).rejects.toThrow(
      /Free plan is not configured/i
    );
  });
});
