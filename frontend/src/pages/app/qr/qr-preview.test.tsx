import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QrPreview } from "./qr-preview";
import type { QrConfig } from "@/api/qr";

const qrCodeSpy = vi.hoisted(() => ({
  created: [] as Array<Record<string, unknown>>,
  updated: [] as Array<Record<string, unknown>>,
}));

vi.mock("qr-code-styling", () => ({
  default: class QRCodeStyling {
    constructor(options: Record<string, unknown>) {
      qrCodeSpy.created.push(options);
    }

    append() {}

    update(options: Record<string, unknown>) {
      qrCodeSpy.updated.push(options);
    }
  },
}));

const config: QrConfig = {
  foregroundColor: "#000000",
  backgroundColor: "#FFFFFF",
  margin: 2,
  pattern: "square",
  eyeStyle: "square",
  eyeBallStyle: "square",
};

afterEach(() => {
  cleanup();
  qrCodeSpy.created.length = 0;
  qrCodeSpy.updated.length = 0;
});

describe("QrPreview encoded payload", () => {
  it("encodes the default short domain when a link has no custom domain", () => {
    render(<QrPreview config={config} shortId="krish" />);

    expect(qrCodeSpy.created.at(-1)).toMatchObject({
      data: "https://go.linkshift.in/krish",
    });
  });

  it("encodes the selected custom domain rather than only displaying it", () => {
    render(<QrPreview config={config} shortId="krish" domainHost="nadeem.io" />);

    expect(qrCodeSpy.created.at(-1)).toMatchObject({
      data: "https://nadeem.io/krish",
    });
  });

  it("updates the encoded payload when the selected link domain changes", () => {
    const view = render(<QrPreview config={config} shortId="krish" domainHost="domain-a.example" />);

    view.rerender(<QrPreview config={config} shortId="krish" domainHost="domain-b.example" />);

    expect(qrCodeSpy.updated.at(-1)).toMatchObject({
      data: "https://domain-b.example/krish",
    });
  });
});
