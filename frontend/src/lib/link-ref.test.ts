import { beforeEach, describe, expect, it, vi } from "vitest";
import { findLinkByRef, linkRef, resolveLinkRef } from "./link-ref";

vi.mock("@/api/links", () => ({
  listLinks: (...args: unknown[]) => listLinksMock(...args),
}));

const listLinksMock = vi.fn();

/** A row as the links endpoint returns it: CUID plus a human-readable slug. */
function row(overrides: Partial<{ id: string; shortId: string }> = {}) {
  return { id: "cmtgueyrjf36se2e92rdqumpb", shortId: "igpromo", ...overrides };
}

function listResult(data: unknown[]) {
  return {
    success: true,
    data,
    pagination: { page: 1, limit: 50, totalRecords: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
  };
}

beforeEach(() => {
  listLinksMock.mockReset();
});

describe("linkRef — what goes into a browser URL", () => {
  it("is the slug, never the database id", () => {
    expect(linkRef(row())).toBe("igpromo");
    expect(linkRef(row())).not.toBe("cmtgueyrjf36se2e92rdqumpb");
  });

  it("trims a padded slug so URLs stay clean", () => {
    expect(linkRef({ id: "cmt1", shortId: "  igpromo  " })).toBe("igpromo");
  });

  it("falls back to the id only when a row carries no slug at all", () => {
    expect(linkRef({ id: "cmt1", shortId: null })).toBe("cmt1");
    expect(linkRef({ id: "cmt1", shortId: "" })).toBe("cmt1");
  });
});

describe("findLinkByRef", () => {
  const links = [row(), row({ id: "cmtsecondshortid0000000000", shortId: "ytbio" })];

  it("matches the canonical slug", () => {
    expect(findLinkByRef("ytbio", links)?.id).toBe("cmtsecondshortid0000000000");
  });

  it("still matches a legacy bookmark that carries the database id", () => {
    expect(findLinkByRef("cmtgueyrjf36se2e92rdqumpb", links)?.shortId).toBe("igpromo");
  });

  it("returns null for an empty or unknown reference", () => {
    expect(findLinkByRef("", links)).toBeNull();
    expect(findLinkByRef(null, links)).toBeNull();
    expect(findLinkByRef("nope", links)).toBeNull();
  });
});

describe("resolveLinkRef", () => {
  it("resolves a slug to the internal id and reports the canonical slug back", async () => {
    listLinksMock.mockResolvedValue(listResult([row()]));

    await expect(resolveLinkRef("igpromo")).resolves.toEqual({
      id: "cmtgueyrjf36se2e92rdqumpb",
      shortId: "igpromo",
    });
    /* the lookup is a list search, which the backend runs over slug too */
    expect(listLinksMock).toHaveBeenCalledWith({ page: 1, limit: 50, search: "igpromo" }, undefined);
  });

  it("resolves an old CUID bookmark and hands back the slug to rewrite it with", async () => {
    listLinksMock.mockResolvedValue(listResult([row()]));

    await expect(resolveLinkRef("cmtgueyrjf36se2e92rdqumpb")).resolves.toEqual({
      id: "cmtgueyrjf36se2e92rdqumpb",
      shortId: "igpromo",
    });
  });

  it("prefers an exact slug over an id-bearing sibling row", async () => {
    listLinksMock.mockResolvedValue(
      listResult([
        row({ id: "igpromo", shortId: "other-slug" }),
        row({ id: "cmtgueyrjf36se2e92rdqumpb", shortId: "igpromo" }),
      ]),
    );

    await expect(resolveLinkRef("igpromo")).resolves.toMatchObject({
      id: "cmtgueyrjf36se2e92rdqumpb",
    });
  });

  it("passes an unlistable reference straight through so old URLs never break", async () => {
    listLinksMock.mockResolvedValue(listResult([]));

    await expect(resolveLinkRef("cmtgueyrjf36se2e92rdqumpb")).resolves.toEqual({
      id: "cmtgueyrjf36se2e92rdqumpb",
      shortId: null,
    });
  });

  it("passes through when the lookup fails, instead of surfacing an error", async () => {
    listLinksMock.mockRejectedValue(new Error("network down"));

    await expect(resolveLinkRef("igpromo")).resolves.toEqual({ id: "igpromo", shortId: null });
  });
});
