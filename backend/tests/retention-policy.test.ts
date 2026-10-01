import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RETENTION_DAYS } from "../src/jobs/retention";

const REPO_ROOT = join(__dirname, "..", "..");
const read = (...segments: string[]) =>
    readFileSync(join(REPO_ROOT, ...segments), "utf8");

const seed = read("backend", "prisma", "seed.ts");
const legalData = read("frontend", "src", "pages", "legal", "legal-data.ts");
const docsData = read("frontend", "src", "pages", "docs", "docs-data.ts");

const planAnalyticsDays = (plan: string): number => {
    const block = seed.split(`name: PlanName.${plan}`)[1] ?? "";
    const days = /analyticsDays:\s*(\d+)/.exec(block)?.[1];
    if (!days) throw new Error(`could not read analyticsDays for ${plan}`);
    return Number(days);
};

const PLANS = ["FREE", "STARTER", "CREATOR", "PRO"] as const;

describe("retention: the window satisfies every plan's promise", () => {
    it.each(PLANS)("%s can read a window it can still look back on", (plan) => {
        // The whole point of keeping retention at three years: no plan may sell
        // a history window longer than the rows we actually keep. If retention
        // were lowered, a paying customer could request a range and find the
        // oldest part of it silently empty.
        expect(planAnalyticsDays(plan)).toBeLessThanOrEqual(RETENTION_DAYS);
    });

    it("Pro is covered exactly, with no gap at the end of its range", () => {
        expect(planAnalyticsDays("PRO")).toBe(RETENTION_DAYS);
    });
});

describe("retention: published documents cannot drift from the job", () => {
    it("the Privacy Policy states the enforced window", () => {
        expect(RETENTION_DAYS).toBe(1095);
        expect(legalData).toContain("3 years from the moment of the click");
    });

    it("the Privacy Policy promises every plan the same window", () => {
        // The failure this prevents: a document implying retention tracks the
        // plan, which would mean a downgrade silently deletes history.
        expect(legalData).toContain("every plan stores the same 3 years");
    });

    it("the Privacy Policy says upgrading restores withheld history", () => {
        expect(legalData).toContain("returns in full if you upgrade");
    });

    it("the Privacy Policy keeps deletion on link and account removal", () => {
        expect(legalData).toContain("removes its analytics immediately");
    });

    it("the docs agree with the Policy", () => {
        expect(docsData).toContain("3 years from the click");
        expect(docsData).toContain("held, not lost");
    });

    it("no document still claims retention follows the plan", () => {
        // The old wording said analytics were kept for the plan's window, which
        // implies Free's data dies at 30 days. It never did, and must not
        // appear again now that a real purge exists.
        expect(legalData).not.toMatch(/kept for your plan/i);
        expect(docsData).not.toMatch(/kept rather than deleted/i);
    });
});