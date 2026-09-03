import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

/* Base UI positions popovers/selects with floating-ui, which reaches for
   ResizeObserver and scrollIntoView — neither exists in jsdom. */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/* jsdom has no SVG geometry engine (and no SVGPathElement global — every
   SVG node is a plain SVGElement); AreaChart's draw-in effect measures
   path length. Return a stable value so effects run without throwing. */
if (typeof SVGElement !== "undefined") {
  const svgProto = SVGElement.prototype as unknown as { getTotalLength?: () => number };
  if (!svgProto.getTotalLength) {
    svgProto.getTotalLength = () => 100;
  }
}
