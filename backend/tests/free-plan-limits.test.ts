import { describe, expect, it, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SEED = readFileSync(resolve(__dirname, "../prisma/seed.ts"), "utf8");
const PRESENTATION = readFileSync(
    resolve(__dirname, "../../frontend/src/pages/pricing/plan-presentation.ts"),
    "utf8",
);

const freeBlock = (): string => {
    const start = SEED.indexOf("name: PlanName.FREE");
    const end = SEED.indexOf("name: PlanName.STARTER");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return SEED.slice(start, end);
};

const blockFor = (plan: "FREE" | "STARTER" | "CREATOR" | "PRO"): string => {
    const order = ["FREE", "STARTER", "CREATOR", "PRO"];
    const start = SEED.indexOf(`name: PlanName.${plan}`);
    const next = order[order.indexOf(plan) + 1];
    const end = next
        ? SEED.indexOf(`name: PlanName.${next}`)
        : SEED.indexOf("async function main");
    return SEED.slice(start, end);
};

const num = (block: string, key: string): number | null => {
    const m = new RegExp(`${key}\\s*:\\s*(null|-?\\d+)`).exec(block);
    if (!m) throw new Error(`${key} not found`);
    return m[1] === "null" ? null : Number(m[1]);
};

describe("FREE plan limits (Phase B1)", () => {
    const free = freeBlock();

    it("grants a small custom-slug allowance — the reason a free user shares a link", () => {
        expect(num(free, "maxCustomSlugsPerMonth")).toBe(5);
    });

    it("grants a meaningful but bounded redirect allowance", () => {
        const redirects = num(free, "maxRedirectsPerMonth")!;
        const grace = num(free, "maxRedirectsWithGracePerMonth")!;

        expect(redirects).toBeGreaterThanOrEqual(10_000);
        
        expect(grace).toBeGreaterThan(redirects);
        expect(grace).toBeLessThanOrEqual(redirects * 2);
    });

    it("raises the link allowance above the old 50", () => {
        expect(num(free, "maxLinks")).toBeGreaterThan(50);
    });

    it("leaves custom domains off the Free tier", () => {
        
        expect(num(free, "maxDomains")).toBe(0);
    });

    it("keeps QR generation and destination edits unchanged", () => {
        expect(num(free, "maxQrPerMonth")).toBe(10);
        expect(num(free, "maxDestinationChangesPerMonth")).toBe(3);
        expect(num(free, "analyticsDays")).toBe(30);
    });

    it("stays free", () => {
        expect(num(free, "monthlyPrice")).toBe(0);
        expect(num(free, "yearlyPrice")).toBe(0);
    });
});

describe("paid plans are untouched by the Phase B1 change", () => {
    it("pins STARTER", () => {
        const b = blockFor("STARTER");
        expect(num(b, "monthlyPrice")).toBe(499);
        expect(num(b, "maxLinks")).toBe(1000);
        expect(num(b, "maxQrPerMonth")).toBe(100);
        expect(num(b, "maxDomains")).toBe(1);
        expect(num(b, "maxRedirectsPerMonth")).toBe(50_000);
        expect(num(b, "maxCustomSlugsPerMonth")).toBe(25);
        expect(num(b, "maxDestinationChangesPerMonth")).toBe(25);
        expect(num(b, "analyticsDays")).toBe(180);
    });

    it("pins CREATOR", () => {
        const b = blockFor("CREATOR");
        expect(num(b, "monthlyPrice")).toBe(999);
        expect(num(b, "maxLinks")).toBe(10_000);
        expect(num(b, "maxQrPerMonth")).toBeNull();
        expect(num(b, "maxDomains")).toBe(5);
        expect(num(b, "maxRedirectsPerMonth")).toBe(500_000);
        expect(num(b, "maxCustomSlugsPerMonth")).toBe(100);
        expect(num(b, "maxDestinationChangesPerMonth")).toBe(150);
        expect(num(b, "analyticsDays")).toBe(365);
    });

    it("pins PRO to unlimited", () => {
        const b = blockFor("PRO");
        expect(num(b, "monthlyPrice")).toBe(4999);
        expect(num(b, "maxLinks")).toBeNull();
        expect(num(b, "maxQrPerMonth")).toBeNull();
        expect(num(b, "maxDomains")).toBeNull();
        expect(num(b, "maxRedirectsPerMonth")).toBeNull();
        expect(num(b, "maxCustomSlugsPerMonth")).toBeNull();
        expect(num(b, "maxDestinationChangesPerMonth")).toBeNull();
        expect(num(b, "analyticsDays")).toBe(1095);
    });
});

describe("the pricing page mirrors the seeded Free plan", () => {
    it("advertises exactly the seeded Free numbers", () => {
        const free = freeBlock();
        for (const key of [
            "maxLinks",
            "maxQrPerMonth",
            "maxDomains",
            "maxRedirectsPerMonth",
            "maxCustomSlugsPerMonth",
            "maxDestinationChangesPerMonth",
            "analyticsDays",
        ]) {
            const seeded = num(free, key);
            const advertised = new RegExp(`${key}\\s*:\\s*(null|-?\\d+)`).exec(
                PRESENTATION,
            );
            expect(advertised, `${key} missing from plan-presentation.ts`).not.toBeNull();
            const value =
                advertised![1] === "null" ? null : Number(advertised![1]);
            expect(value, `${key} drifted from the seed`).toBe(seeded);
        }
    });

    it("no longer hides the Free custom-slug and destination-edit limits behind a dash", () => {
        expect(PRESENTATION).not.toMatch(/OVERRIDES/);
    });
});

describe("every numeric limit ascends with the plan ladder", () => {
    // The custom-slug ladder shipped inverted — Starter paid 10x more than
    // Free and got half the slugs — and survived because every test pinned a
    // number individually and nothing ever asserted the ladder ASCENDS. This
    // is that assertion: the next inversion fails here regardless of which
    // individual numbers the pins above expect.
    const PLANS = ["FREE", "STARTER", "CREATOR", "PRO"] as const;

    // Prices are deliberately excluded: Free is legitimately 0.
    const ASCENDING_LIMITS = [
        "maxCustomSlugsPerMonth",
        "maxDestinationChangesPerMonth",
        "maxLinks",
        "maxRedirectsPerMonth",
        "maxQrPerMonth",
        "maxDomains",
        "analyticsDays",
    ];

    // `null` means unlimited, which outranks any number.
    const value = (plan: (typeof PLANS)[number], key: string): number =>
        num(blockFor(plan), key) ?? Number.POSITIVE_INFINITY;

    for (const key of ASCENDING_LIMITS) {
        it(`${key} is non-decreasing from Free to Pro`, () => {
            for (let i = 1; i < PLANS.length; i++) {
                const lower = value(PLANS[i - 1], key);
                const higher = value(PLANS[i], key);
                expect(
                    higher,
                    `${key}: ${PLANS[i]} (${higher}) must be >= ${PLANS[i - 1]} (${lower})`,
                ).toBeGreaterThanOrEqual(lower);
            }
        });
    }
});