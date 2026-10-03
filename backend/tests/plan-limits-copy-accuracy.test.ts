import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Plan limits are the most repeated claim in LinkShift's public copy, and the
 * two halves that define them live on opposite sides of the repo: the numbers
 * are seeded into Postgres by `prisma/seed.ts`, while the docs page and the
 * FAQ hand-write the same numbers as prose in the frontend.
 *
 * B1 raised the Free plan from 50 links / 2,500 redirects to 100 / 10,000. It
 * updated `seed.ts` and the pricing table, and left the docs table and the FAQ
 * answer quoting the old figures. Nothing failed, because prose is not
 * typechecked against the data it describes — a visitor was told they got half
 * of what they actually got.
 *
 * This test lives on the backend because `prisma/seed.ts` is the source of
 * truth and the backend tsconfig has Node types available, which the frontend
 * app tsconfig deliberately does not.
 */

const REPO_ROOT = join(__dirname, "..", "..");

const read = (...segments: string[]): string =>
    readFileSync(join(REPO_ROOT, ...segments), "utf8");

const seed = read("backend", "prisma", "seed.ts");
const docsData = read("frontend", "src", "pages", "docs", "docs-data.ts");
// The FAQ answers live in faq-data.ts. They used to sit inside faq-page.tsx,
// which was moved so the page component could export nothing but the component.
const faqPage = read("frontend", "src", "pages", "faq", "faq-data.ts");

interface SeedPlan {
    name: string;
    limits: Record<string, number | null>;
}

const parseSeedPlans = (): SeedPlan[] => {
    const markers = [...seed.matchAll(/name:\s*PlanName\.(\w+)/g)];

    return markers.map((marker, index) => {
        const start = marker.index! + marker[0].length;
        const end = markers[index + 1]?.index ?? seed.length;

        const limits: Record<string, number | null> = {};
        for (const m of seed
            .slice(start, end)
            .matchAll(/(max[A-Za-z]+|analyticsDays)\s*:\s*(null|\d+)/g)) {
            limits[m[1]] = m[2] === "null" ? null : Number(m[2]);
        }

        return { name: marker[1], limits };
    });
};

const plans = parseSeedPlans();

const plan = (name: string): SeedPlan => {
    const found = plans.find((p) => p.name === name);
    if (!found) throw new Error(`plan ${name} not found in seed.ts`);
    return found;
};

const us = (n: number): string => n.toLocaleString("en-US");

/** The "Free: ..." sentence the docs publish. */
const docsFreeLine = (): string => {
    const m = docsData.match(/Free:\s*[\d,\/ ]+[^"]*?analytics\./);
    if (!m) throw new Error("could not find the Free plan line in docs-data.ts");
    return m[0];
};

/** The FAQ answer body for "Is there a free plan?". */
const faqFreeAnswer = (): string => {
    const m = faqPage.match(/q:\s*"Is there a free plan\?",\s*\n\s*a:\s*"([^"]+)"/);
    if (!m) throw new Error("could not find the free-plan FAQ answer");
    return m[1];
};

describe("seed.ts parses as the plan source of truth", () => {
    it("finds all four sellable plans", () => {
        expect(plans.map((p) => p.name)).toEqual([
            "FREE",
            "STARTER",
            "CREATOR",
            "PRO",
        ]);
    });

    it("reads the Free limits the product actually enforces", () => {
        const free = plan("FREE");

        expect(free.limits.maxLinks).toBe(100);
        expect(free.limits.maxRedirectsPerMonth).toBe(10_000);
        expect(free.limits.maxQrPerMonth).toBe(10);
        expect(free.limits.maxCustomSlugsPerMonth).toBe(5);
        expect(free.limits.maxDomains).toBe(0);
        expect(free.limits.analyticsDays).toBe(30);
    });
});

describe("published Free limits match the seeded Free limits", () => {
    const free = plan("FREE");

    it("the docs plans table states the current Free numbers", () => {
        const line = docsFreeLine();

        expect(line).toContain(`Free: ${us(free.limits.maxLinks!)} links`);
        expect(line).toContain(
            `${us(free.limits.maxRedirectsPerMonth!)} redirects/month`
        );
        expect(line).toContain(
            `${free.limits.maxCustomSlugsPerMonth!} custom slugs/month`
        );
    });

    it("the FAQ free-plan answer states the current Free numbers", () => {
        const answer = faqFreeAnswer();

        expect(answer).toContain(`${us(free.limits.maxLinks!)} links`);
        expect(answer).toContain(
            `${us(free.limits.maxRedirectsPerMonth!)} redirects a month`
        );
        expect(answer).toContain(
            `${free.limits.maxCustomSlugsPerMonth!} custom slugs a month`
        );
    });

    it("publishes no retired Free figures anywhere in public copy", () => {
        const publicCopy = `${docsData}\n${faqPage}`;

        // 50 links and 2,500 redirects were the pre-B1 Free plan. They must
        // not survive anywhere as a Free claim.
        expect(publicCopy).not.toMatch(/Free[^.]{0,120}\b50 links\b/);
        expect(publicCopy).not.toMatch(/Free[^.]{0,120}2,500 redirects/);
    });

    it("does not claim custom domains on the Free plan", () => {
        // Free seeds maxDomains: 0, so a Free sentence claiming a custom
        // domain would be false.
        expect(plan("FREE").limits.maxDomains).toBe(0);
        expect(docsFreeLine()).not.toMatch(/custom domain/i);
        expect(faqFreeAnswer()).not.toMatch(/custom domain/i);
    });
});

describe("published analytics windows match the seeded windows", () => {
    const docsAll = (): string => {
        const m = docsData.match(
            /Free:[\s\S]*?3-year analytics\./
        );
        if (!m) throw new Error("could not find the full plans paragraph");
        return m[0];
    };

    it.each([
        ["FREE", "30-day analytics"],
        ["STARTER", "180-day analytics"],
        ["CREATOR", "365-day analytics"],
        ["PRO", "3-year analytics"],
    ])("docs states the %s window as %s", (name, phrase) => {
        expect(docsAll()).toContain(phrase);
    });

    it("derives those phrases from the seeded day counts", () => {
        expect(plan("FREE").limits.analyticsDays).toBe(30);
        expect(plan("STARTER").limits.analyticsDays).toBe(180);
        expect(plan("CREATOR").limits.analyticsDays).toBe(365);
        expect(plan("PRO").limits.analyticsDays).toBe(1095);
        // 1095 days is the "3-year" the docs publish.
        expect(Math.round(1095 / 365)).toBe(3);
    });
});
