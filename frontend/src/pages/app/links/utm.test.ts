import { describe, expect, it } from "vitest";
import {
  emptyUtm,
  hasAnyUtm,
  utmCreatePayload,
  utmFromLink,
  utmMissingRequired,
  utmUpdatePatch,
} from "./utm";
import type { LinkItem } from "@/types/api";

/**
 * The wire contract between the two link dialogs and PUT/POST /api/links/:id.
 * The backend half (buildUtmUrl rebuilding the destination from the merged tags)
 * is covered in backend/tests/utm-url.test.ts.
 */

function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "cmosgt79v0002umy1dlczw6hu",
    name: null,
    shortUrl: "https://lk.cn/zip3",
    shortPath: "/zip3",
    targetUrl: "https://example.com/pricing",
    isActive: true,
    expiresAt: null,
    passwordProtected: false,
    deepLink: false,
    scannedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    domain: null,
    qrFileKey: null,
    qrGeneratedAt: null,
    _count: { scans: 0 },
    ...overrides,
  } as LinkItem;
}

describe("utmFromLink", () => {
  it("seeds empty fields when the link carries no tags", () => {
    expect(utmFromLink(makeLink())).toEqual(emptyUtm());
  });

  it("seeds null tags as empty strings", () => {
    const link = makeLink({
      utmSource: "newsletter",
      utmMedium: null,
      utmCampaign: "spring_sale",
      utmTerm: undefined,
      utmContent: "hero",
    });
    expect(utmFromLink(link)).toEqual({
      source: "newsletter",
      medium: "",
      campaign: "spring_sale",
      term: "",
      content: "hero",
    });
  });
});

describe("utmMissingRequired", () => {
  it("passes while no tag is used at all", () => {
    expect(utmMissingRequired(emptyUtm())).toBe(false);
  });

  it("requires source, medium and campaign once any tag is present", () => {
    expect(utmMissingRequired({ ...emptyUtm(), term: "running shoes" })).toBe(true);
    expect(
      utmMissingRequired({ ...emptyUtm(), source: "newsletter", medium: "email" })
    ).toBe(true);
    expect(
      utmMissingRequired({
        source: "newsletter",
        medium: "email",
        campaign: "spring_sale",
        term: "running shoes",
        content: "",
      })
    ).toBe(false);
  });

  it("hasAnyUtm detects an optional tag on its own", () => {
    expect(hasAnyUtm(emptyUtm())).toBe(false);
    expect(hasAnyUtm({ ...emptyUtm(), content: "hero" })).toBe(true);
  });
});

describe("utmCreatePayload", () => {
  it("omits blank tags and trims the rest", () => {
    const payload = utmCreatePayload({
      source: "  newsletter  ",
      medium: "email",
      campaign: "",
      term: "   ",
      content: "hero",
    });
    expect(payload).toEqual({
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: undefined,
      utmTerm: undefined,
      utmContent: "hero",
    });
  });
});

describe("utmUpdatePatch", () => {
  const stored = {
    source: "newsletter",
    medium: "email",
    campaign: "spring_sale",
    term: "running shoes",
    content: "",
  };

  it("sends nothing when the tags were not modified", () => {
    expect(utmUpdatePatch(stored, { ...stored })).toEqual({});
    expect(utmUpdatePatch(stored, { ...stored, content: "   " })).toEqual({});
  });

  it("sends only the changed tag", () => {
    expect(utmUpdatePatch(stored, { ...stored, campaign: "autumn_sale" })).toEqual({
      utmCampaign: "autumn_sale",
    });
  });

  it("nulls a tag the user cleared, so it is removed from the destination", () => {
    expect(utmUpdatePatch(stored, { ...stored, term: "" })).toEqual({ utmTerm: null });
  });

  it("adds a tag that was not stored before", () => {
    expect(utmUpdatePatch(stored, { ...stored, content: "hero" })).toEqual({
      utmContent: "hero",
    });
  });
});
