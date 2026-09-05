import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Unit tests for the custom-domain allowance check (billing.service).
// The Free plan seeds maxDomains: 0 — custom domains are paid-plan only and
// Free accounts use the shared go.linkshift.in domain. These tests pin the
// allowance arithmetic: a 0 cap is a real cap, counts are scoped to the
// user's OWN domains, and null means unlimited.
// ---------------------------------------------------------------------------

const { prisma } = vi.hoisted(() => ({
    prisma: {
        subscription: { findFirst: vi.fn() },
        plan: { findUnique: vi.fn() },
        domain: { count: vi.fn() },
    },
}));

vi.mock(import("../src/config"), () => ({ prisma }));

import { checkDomainLimit } from "../src/features/billing/billing.service";

function planRow(name: string, maxDomains: number | null) {
    return { id: `plan-${name}`, name, maxDomains };
}

beforeEach(() => {
    vi.clearAllMocks();
    // No entitled subscription → getUserPlan falls back to the plan table.
    prisma.subscription.findFirst.mockResolvedValue(null);
});

describe("checkDomainLimit", () => {
    it("Free plan (maxDomains 0) is at its limit even with zero owned domains", async () => {
        prisma.plan.findUnique.mockResolvedValue(planRow("FREE", 0));
        prisma.domain.count.mockResolvedValue(0);

        await expect(checkDomainLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
            message: "You have reached the maximum number of custom domains allowed by your plan",
        });
    });

    it("counts only the user's own domains — the shared default is never charged", async () => {
        prisma.plan.findUnique.mockResolvedValue(planRow("FREE", 0));
        prisma.domain.count.mockResolvedValue(0);

        await checkDomainLimit("user-1").catch(() => undefined);

        expect(prisma.domain.count).toHaveBeenCalledWith({
            where: { userId: "user-1" },
        });
    });

    it("Starter (maxDomains 1) allows the first domain and blocks the second", async () => {
        prisma.plan.findUnique.mockResolvedValue(planRow("STARTER", 1));

        prisma.domain.count.mockResolvedValue(0);
        await expect(checkDomainLimit("user-1")).resolves.toMatchObject({
            allowed: true,
            used: 0,
            limit: 1,
        });

        prisma.domain.count.mockResolvedValue(1);
        await expect(checkDomainLimit("user-1")).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("Pro (maxDomains null) is unlimited", async () => {
        prisma.plan.findUnique.mockResolvedValue(planRow("PRO", null));
        prisma.domain.count.mockResolvedValue(7);

        await expect(checkDomainLimit("user-1")).resolves.toMatchObject({
            allowed: true,
            used: 7,
            limit: null,
        });
    });
});
