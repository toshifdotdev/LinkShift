import { describe, expect, it, vi, beforeEach } from "vitest";

const { prisma } = vi.hoisted(() => {
    // getUserPlan resolves in two steps: an entitled subscription first, then
    // the FREE plan row as a fallback. Both have to be mocked or the real
    // implementation throws before the gate is ever reached.
    const prisma = {
        subscription: { findFirst: vi.fn() },
        plan: { findUnique: vi.fn() },
    };
    return { prisma };
});

vi.mock(import("../src/config"), () => ({ prisma }));

import {
    hasOgPreviewAccess,
    checkOgPreviewAccess,
} from "../src/features/billing/billing.service";

const planRow = (name: string) => ({
    id: `plan-${name}`,
    name,
    maxLinks: 1000,
    maxQrPerMonth: 10,
    maxDomains: 1,
    maxCustomSlugsPerMonth: 25,
    maxDestinationChangesPerMonth: 25,
    maxRedirectsPerMonth: 50_000,
    analyticsDays: 365,
    monthlyPrice: 999,
    yearlyPrice: 9990,
});

/** Puts the account on a paid tier via an entitled subscription. */
const asSubscriber = (tier: string) => {
    prisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        status: "ACTIVE",
        plan: planRow(tier),
        pendingPlan: null,
    });
};

/** Puts the account on the free tier: no subscription, FREE plan row. */
const asFree = () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue(planRow("FREE"));
};

beforeEach(() => {
    vi.clearAllMocks();
    asFree();
});

describe("social link preview entitlement", () => {
    // The pricing table marks this Creator + Pro. Before this gate existed the
    // fields were writable on every plan, so the table would have been a claim
    // the API contradicted.
    it.each(["CREATOR", "PRO"])("allows %s", async (tier) => {
        asSubscriber(tier);
        expect(await hasOgPreviewAccess("u1")).toBe(true);
    });

    it.each(["STARTER"])("refuses %s", async (tier) => {
        asSubscriber(tier);
        expect(await hasOgPreviewAccess("u1")).toBe(false);
        await expect(checkOgPreviewAccess("u1")).rejects.toThrow(/Creator and Pro/i);
    });

    it("refuses a Free user", async () => {
        asFree();
        expect(await hasOgPreviewAccess("u1")).toBe(false);
    });

    it("names both eligible tiers in the error so the upgrade is actionable", async () => {
        asSubscriber("STARTER");
        await expect(checkOgPreviewAccess("u1")).rejects.toThrow(
            /Creator and Pro plans/
        );
    });

    it("passes quietly for an entitled user", async () => {
        asSubscriber("PRO");
        await expect(checkOgPreviewAccess("u1")).resolves.toBeUndefined();
    });
});

describe("social link preview gating is not over-eager", () => {
    // The whole point of gating on "fields were sent" rather than "always":
    // a Free user creating a plain link must never be blocked by a feature
    // they did not touch. That would make the product unusable on the free
    // tier, which is the tier that has to work for acquisition.
    it("the caller decides by only invoking the gate when og fields are present", () => {
        // This is a structural guarantee: the guard in link.service.ts is
        // `hasAnyOg && checkOgPreviewAccess`. Asserting the shape of the
        // source keeps someone from making the call unconditional later.
        const src = require("node:fs").readFileSync(
            require("node:path").join(
                __dirname,
                "..",
                "src",
                "features",
                "link",
                "link.service.ts"
            ),
            "utf8"
        ) as string;

        expect(src).toMatch(/const hasAnyOg =/);
        expect(src).toMatch(/if \(hasAnyOg\) \{\s*await checkOgPreviewAccess\(userId\);/);
        // Exactly one call in create, and it sits inside the `hasAnyOg` guard.
        // Counting the occurrences is what catches someone hoisting it out to
        // the top of the function, which would gate plain link creation.
        expect(src.match(/checkOgPreviewAccess\(userId\)/g)?.length).toBe(1);
    });

    it("the update path gates on change, not on presence", () => {
        const src = require("node:fs").readFileSync(
            require("node:path").join(
                __dirname,
                "..",
                "src",
                "features",
                "link",
                "link.service.ts"
            ),
            "utf8"
        ) as string;

        expect(src).toMatch(/const ogChanged =/);
        // Editing an unrelated field on a link that already has a preview must
        // keep working after a downgrade, rather than 403 on a no-op PATCH.
        expect(src).toMatch(/if \(ogChanged\) \{\s*await checkOgPreviewAccess\(data\.userId\);/);
    });
});