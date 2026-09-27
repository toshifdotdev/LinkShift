import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prisma,
  checkQrLimit,
  getUserPlan,
  generateQrImage,
  uploadBuffer,
  buildQrResponse,
} = vi.hoisted(() => ({
  prisma: {
    link: { findFirst: vi.fn() },
    qr: { findFirst: vi.fn(), create: vi.fn() },
  },
  checkQrLimit: vi.fn(),
  getUserPlan: vi.fn(),
  generateQrImage: vi.fn(),
  uploadBuffer: vi.fn(),
  buildQrResponse: vi.fn(),
}));

vi.mock(import("../src/config"), () => ({ prisma }));
vi.mock(import("../src/features/billing/billing.service"), () => ({ checkQrLimit, getUserPlan }));
vi.mock(import("../src/utils/generateQr"), () => ({ generateQrImage }));
vi.mock(import("../src/utils/uploadBuffer"), () => ({ uploadBuffer }));
vi.mock(import("../src/utils/buildQrResponse"), () => ({ buildQrResponse }));

import { qrService } from "../src/features/qr/qr.service";

function mockLink(domainHost: string) {
  prisma.link.findFirst.mockResolvedValue({
    id: "link-1",
    userId: "user-1",
    shortId: "krish",
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    domain: { host: domainHost },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  checkQrLimit.mockResolvedValue(undefined);
  prisma.qr.findFirst.mockResolvedValue(null);
  generateQrImage.mockResolvedValue({ buffer: Buffer.from("qr") });
  uploadBuffer.mockResolvedValue({ url: "https://cdn.example/qr.png", publicId: "qrs/qr" });
  prisma.qr.create.mockResolvedValue({ id: "qr-1" });
  buildQrResponse.mockReturnValue({ id: "qr-1" });
});

describe("qrService encoded payload", () => {
  it("encodes the shared default domain for a default-domain link", async () => {
    mockLink("go.linkshift.in");

    await qrService({ userId: "user-1", linkId: "link-1" });

    expect(generateQrImage).toHaveBeenCalledWith(expect.objectContaining({
      shortUrl: "https://go.linkshift.in/krish",
    }));
  });

  it("encodes the custom domain associated with the link", async () => {
    mockLink("nadeem.io");

    await qrService({ userId: "user-1", linkId: "link-1" });

    expect(generateQrImage).toHaveBeenCalledWith(expect.objectContaining({
      shortUrl: "https://nadeem.io/krish",
    }));
  });

  it("regenerates instead of returning a cached QR after the link moves to another domain", async () => {
    mockLink("domain-b.example");
    prisma.qr.findFirst.mockResolvedValue({
      id: "qr-old",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await qrService({ userId: "user-1", linkId: "link-1" });

    expect(generateQrImage).toHaveBeenCalledWith(expect.objectContaining({
      shortUrl: "https://domain-b.example/krish",
    }));
    expect(buildQrResponse).toHaveBeenCalledWith({ id: "qr-1" }, "krish");
  });
});
