import { describe, expect, it } from "vitest";

import { FLAG_ROWS } from "./plan-presentation";

/**
 * Bulk link import is sold as a Creator + Pro feature, so the pricing table has
 * to say so. Two failure modes this prevents:
 *
 *   - The row is missing entirely: prospects never learn the feature exists,
 *     so paid accounts pay for something invisible.
 *   - The row drifts from the backend entitlement: someone pays for a feature
 *     they cannot use, or sees one they never get.
 *
 * The entitlement lives in `checkLinkImportAccess` (backend) and `canImport` on
 * the Links page. All three must agree, and this file pins the third.
 */

const SELLABLE_PLANS = ["FREE", "STARTER", "CREATOR", "PRO"] as const;

const row = (label: string) => {
  const found = FLAG_ROWS.find((entry) => entry.label === label);
  if (!found) throw new Error(`pricing table has no "${label}" row`);
  return found;
};

/** `note` is optional on FlagRow, but these rows are required to carry one. */
const noteOf = (label: string): string => {
  const note = row(label).note;
  if (!note) throw new Error(`"${label}" has no note`);
  return note;
};

describe("pricing: bulk link import", () => {
  it("is listed on the pricing table", () => {
    expect(row("Bulk link import")).toBeDefined();
  });

  it("is shown for Creator and Pro only", () => {
    expect(row("Bulk link import").values).toEqual({
      FREE: false,
      STARTER: false,
      CREATOR: true,
      PRO: true,
    });
  });

  it("carries a note that says it creates links in bulk, not analytics", () => {
    // "CSV analytics export" already exists as a different feature. The
    // wording has to make the two distinguishable on sight.
    const note = noteOf("Bulk link import").toLowerCase();
    expect(note).toContain("many links");
    expect(note).toContain("csv");
  });

  it("keeps CSV analytics export as a separate, still-visible feature", () => {
    // The two rows must not be conflated: one downloads click data, the other
    // creates links.
    const exportRow = row("CSV analytics export");
    const importRow = row("Bulk link import");

    expect(exportRow).not.toBe(importRow);
    expect(noteOf("CSV analytics export").toLowerCase()).toContain("click ledger");
    expect(noteOf("Bulk link import").toLowerCase()).not.toContain("click ledger");
  });

  it("agrees with the backend entitlement across every sellable plan", () => {
    // Mirrors `checkLinkImportAccess`: plan.name === "CREATOR" || "PRO".
    for (const plan of SELLABLE_PLANS) {
      const shown = row("Bulk link import").values[plan];
      const backendAllows = plan === "CREATOR" || plan === "PRO";
      expect(shown, `${plan} disagrees with the backend gate`).toBe(backendAllows);
    }
  });

  it("declares every sellable plan on the row", () => {
    for (const plan of SELLABLE_PLANS) {
      expect(
        Object.prototype.hasOwnProperty.call(row("Bulk link import").values, plan),
        `missing plan: ${plan}`
      ).toBe(true);
    }
  });
});
