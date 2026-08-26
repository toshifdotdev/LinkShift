import type { QrConfig } from "@/api/qr";

type Frame = "none" | "clean" | "label" | "branded";

/**
 * Ready-made styles. Every preset maps ONLY to fields the backend
 * persists and renders (colors, margin, pattern, eye styles) — nothing
 * cosmetic is faked client-side.
 */
export interface QrPreset {
  name: string;
  config: Pick<QrConfig, "foregroundColor" | "backgroundColor" | "margin" | "pattern" | "eyeStyle" | "eyeBallStyle">;
  /** frames are composed server-side at download; Creator/Pro */
  frame?: Frame;
}

export const QR_PRESETS: QrPreset[] = [
  {
    name: "Classic",
    config: { foregroundColor: "#000000", backgroundColor: "#FFFFFF", margin: 2, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
  },
  {
    name: "Ember",
    config: { foregroundColor: "#E8590C", backgroundColor: "#0D0D0D", margin: 3, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "Midnight",
    config: { foregroundColor: "#F5F1EB", backgroundColor: "#111111", margin: 2, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
  },
  {
    name: "Dot Matrix",
    config: { foregroundColor: "#1F2937", backgroundColor: "#F9FAFB", margin: 3, pattern: "dots", eyeStyle: "dot", eyeBallStyle: "dot" },
  },
  {
    name: "Soft",
    config: { foregroundColor: "#374151", backgroundColor: "#F3F4F6", margin: 4, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "Blueprint",
    config: { foregroundColor: "#1D4ED8", backgroundColor: "#EFF6FF", margin: 2, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
  },
  {
    name: "Forest",
    config: { foregroundColor: "#14532D", backgroundColor: "#F0FDF4", margin: 3, pattern: "dots", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "High Contrast",
    config: { foregroundColor: "#000000", backgroundColor: "#FFFFFF", margin: 0, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
  },
  {
    name: "Scan Me",
    config: { foregroundColor: "#111111", backgroundColor: "#FFFFFF", margin: 2, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
    frame: "label",
  },
  {
    name: "Branded Ember",
    config: { foregroundColor: "#F5F1EB", backgroundColor: "#0D0D0D", margin: 3, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
    frame: "branded",
  },
  {
    name: "Editorial",
    config: { foregroundColor: "#1C1917", backgroundColor: "#FAFAF7", margin: 4, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
    frame: "label",
  },
  {
    name: "Terminal",
    config: { foregroundColor: "#22C55E", backgroundColor: "#0A0A0A", margin: 2, pattern: "dots", eyeStyle: "square", eyeBallStyle: "square" },
  },
  {
    name: "Cotton",
    config: { foregroundColor: "#9D174D", backgroundColor: "#FDF2F8", margin: 4, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "Bold",
    config: { foregroundColor: "#FFFFFF", backgroundColor: "#E8590C", margin: 1, pattern: "square", eyeStyle: "square", eyeBallStyle: "square" },
    frame: "branded",
  },
  {
    name: "Ocean",
    config: { foregroundColor: "#0C4A6E", backgroundColor: "#F0F9FF", margin: 3, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "Rose",
    config: { foregroundColor: "#9F1239", backgroundColor: "#FFF1F2", margin: 3, pattern: "dots", eyeStyle: "dot", eyeBallStyle: "dot" },
  },
  {
    name: "Sand",
    config: { foregroundColor: "#78350F", backgroundColor: "#FEFCE8", margin: 4, pattern: "rounded", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
  {
    name: "Noir",
    config: { foregroundColor: "#FFFFFF", backgroundColor: "#000000", margin: 2, pattern: "dots", eyeStyle: "extraRounded", eyeBallStyle: "dot" },
  },
];
