import { describe, expect, it } from "vitest";
import { graceLabel } from "@/lib/redirect-grace";

describe("graceLabel", () => {
    it("shows nothing while the customer is inside the normal allowance", () => {
        expect(graceLabel(0, 10_000, 15_000)).toBeUndefined();
        expect(graceLabel(9_999, 10_000, 15_000)).toBeUndefined();
    });

    it("shows the grace total once the hard cap is passed", () => {
        
        expect(graceLabel(10_400, 10_000, 15_000)).toBe(
            "10,400 / 15,000 — grace",
        );
    });

    it("marks the band as used once the grace ceiling is passed", () => {
        expect(graceLabel(15_001, 10_000, 15_000)).toBe(
            "15,001 / 15,000 — grace used",
        );
    });

    it("stays silent on unlimited plans", () => {
        expect(graceLabel(999_999, null, null)).toBeUndefined();
    });

    it("stays silent when a plan has no grace band", () => {
        expect(graceLabel(50, 100, null)).toBeUndefined();
        expect(graceLabel(50, 100, 0)).toBeUndefined();
    });

    it("ignores a grace cap that is not actually above the hard cap", () => {
        
        expect(graceLabel(50, 100, 100)).toBeUndefined();
        expect(graceLabel(50, 100, 40)).toBeUndefined();
    });

    it("handles missing usage and a zero cap", () => {
        expect(graceLabel(null, 10_000, 15_000)).toBeUndefined();
        expect(graceLabel(5, 0, 15_000)).toBeUndefined();
    });
});