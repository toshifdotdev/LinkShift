import { describe, expect, it } from "vitest";
import { FRAME_SPECS, LABEL_GAP, LABEL_RADIUS } from "../src/utils/qrFrameCompose";

/**
 * The studio LIVE PREVIEW (frontend/src/pages/app/qr/qr-preview.tsx FRAMES)
 * and the backend composer (FRAME_SPECS) must stay in lock-step, otherwise
 * the exported PNG drifts from what the user sees. This suite pins the
 * preview's values and asserts the backend spec matches them exactly.
 */
const PREVIEW_FRAMES = {
  none: { pad: 0, border: 0, labelHeight: 0, label: "", borderEmber: false, double: false },
  clean: { pad: 26, border: 6, labelHeight: 0, label: "", borderEmber: false, double: false },
  double: { pad: 30, border: 4, labelHeight: 0, label: "", borderEmber: false, double: true },
  accent: { pad: 24, border: 14, labelHeight: 0, label: "", borderEmber: true, double: false },
  label: { pad: 26, border: 6, labelHeight: 56, label: "SCAN ME", borderEmber: false, double: false },
  branded: { pad: 28, border: 8, labelHeight: 58, label: "SCAN ME", borderEmber: true, double: false },
} as const;

describe("QR frame geometry — preview (frontend FRAMES) mirrors backend FRAME_SPECS", () => {
  it("exposes every preview frame in FRAME_SPECS", () => {
    expect(Object.keys(FRAME_SPECS).sort()).toEqual(Object.keys(PREVIEW_FRAMES).sort());
  });

  it.each(Object.keys(PREVIEW_FRAMES))("%s: geometry matches the live preview", (name) => {
    const spec = FRAME_SPECS[name as keyof typeof FRAME_SPECS];
    const prev = PREVIEW_FRAMES[name as keyof typeof PREVIEW_FRAMES];
    expect(spec.pad, "pad").toBe(prev.pad);
    expect(spec.border, "border").toBe(prev.border);
    expect(spec.labelHeight, "labelHeight").toBe(prev.labelHeight);
    expect(spec.labelText, "labelText").toBe(prev.label);
    expect(spec.ember, "ember").toBe(prev.borderEmber);
    expect(spec.double, "double").toBe(prev.double);
  });

  it("label layout constants match the preview (LABEL_GAP=8, LABEL_RADIUS=6)", () => {
    expect(LABEL_GAP).toBe(8);
    expect(LABEL_RADIUS).toBe(6);
  });

  it("all exported frames have a positive border (composer is only called for framed QRs)", () => {
    for (const [name, spec] of Object.entries(FRAME_SPECS)) {
      if (name === "none") continue;
      expect(spec.border, name).toBeGreaterThan(0);
    }
  });
});