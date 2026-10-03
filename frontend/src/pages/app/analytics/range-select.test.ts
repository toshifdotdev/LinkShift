import { describe, expect, it } from "vitest";
import { RANGE_OPTIONS, defaultRangeFor, planRank, rangeLocked } from "./range-select";

/**
 * The window a dashboard page opens on must follow the plan's history promise,
 * not a hardcoded 30D.
 *
 * The regression this prevents: every page defaulted to 30D regardless of plan,
 * so an account whose clicks were older than 30 days (a Pro account entitled to
 * 3 years of history) opened on an empty window — graphs, top links and
 * activity all blank — while the links ledger, which counts lifetime, showed
 * its clicks. The two surfaces disagreed with nothing on screen to explain why.
 */
describe("defaultRangeFor", () => {
    it("opens Free on 30D, the full Free window", () => {
        expect(defaultRangeFor("FREE")).toBe(30);
    });

    it("opens each paid plan on the widest window it is entitled to", () => {
        expect(defaultRangeFor("STARTER")).toBe(180);
        expect(defaultRangeFor("CREATOR")).toBe(365);
        expect(defaultRangeFor("PRO")).toBe(1095);
    });

    it("never picks a range the plan would have locked", () => {
        for (const plan of ["FREE", "STARTER", "CREATOR", "PRO", "ENTERPRISE"]) {
            const picked = RANGE_OPTIONS.find((r) => r.days === defaultRangeFor(plan));
            expect(picked, `${plan} must resolve to a real option`).toBeDefined();
            expect(rangeLocked(picked!, plan), `${plan} default must be unlocked`).toBe(false);
        }
    });

    it("treats an unknown plan exactly like Free", () => {
        // rank lookup falls back to FREE, so an unrecognised plan must not get
        // a narrower or wider default than the plan it is treated as.
        expect(defaultRangeFor("NOT_A_PLAN")).toBe(defaultRangeFor("FREE"));
        expect(defaultRangeFor("NOT_A_PLAN")).toBe(30);
    });

    it("is monotonic with plan rank: a higher plan never opens a narrower window", () => {
        const plans = ["FREE", "STARTER", "CREATOR", "PRO"];
        const windows = plans.map((p) => defaultRangeFor(p));
        for (let i = 1; i < windows.length; i++) {
            expect(
                windows[i],
                `${plans[i]} window must be >= ${plans[i - 1]} window`,
            ).toBeGreaterThanOrEqual(windows[i - 1]);
            expect(planRank(plans[i])).toBeGreaterThan(planRank(plans[i - 1]));
        }
    });
});
