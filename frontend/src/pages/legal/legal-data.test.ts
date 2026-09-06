import { describe, expect, it } from "vitest";
import { LEGAL_DOCS } from "./legal-data";

// The legal pages ship publicly; identity/address placeholders render as
// visible "TODO" boxes. Once the operator identity was supplied these must
// never come back — a future gap should be resolved, not shipped as a box.
describe("legal documents", () => {
  it("ships all six policies", () => {
    expect(LEGAL_DOCS.map((d) => d.slug)).toEqual([
      "privacy",
      "terms",
      "refunds",
      "shipping",
      "acceptable-use",
      "contact",
    ]);
  });

  it("contains no TODO placeholder blocks", () => {
    for (const doc of LEGAL_DOCS) {
      for (const section of doc.sections) {
        for (const block of section.blocks) {
          expect(block.kind, `${doc.slug} → ${section.heading}`).not.toBe("todo");
        }
      }
    }
  });

  it("names the operator consistently where identity is stated", () => {
    const texts = LEGAL_DOCS.flatMap((d) =>
      d.sections.flatMap((s) => s.blocks.map((b) => ("text" in b ? b.text : ""))),
    );
    const identity = texts.filter((t) => t.includes("sole proprietorship"));
    expect(identity.length).toBeGreaterThanOrEqual(3);
    for (const t of identity) {
      expect(t).toContain("LinkShift");
      expect(t).toContain("Dehradun, Uttarakhand, India");
    }
    // No registration numbers or personal names may be introduced.
    for (const t of texts) {
      expect(t).not.toMatch(/Udyam|GSTIN|CIN\b/);
    }
  });
});
