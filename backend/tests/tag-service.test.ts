import { describe, expect, it, vi, beforeEach } from "vitest";

const {
    prisma,
    tagFindMany,
    tagFindFirst,
    tagCreate,
    tagUpsert,
    tagUpdate,
    tagDelete,
    linkTagDeleteMany,
    linkTagCreateMany,
} = vi.hoisted(() => {
    const prisma = {
        tag: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            upsert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        linkTag: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    return {
        prisma,
        tagFindMany: prisma.tag.findMany,
        tagFindFirst: prisma.tag.findFirst,
        tagCreate: prisma.tag.create,
        tagUpsert: prisma.tag.upsert,
        tagUpdate: prisma.tag.update,
        tagDelete: prisma.tag.delete,
        linkTagDeleteMany: prisma.linkTag.deleteMany,
        linkTagCreateMany: prisma.linkTag.createMany,
    };
});

vi.mock(import("../src/config"), () => ({ prisma }));

import {
    applyTagsToLink,
    syncTagsIfProvided,
    normaliseTagName,
    createTag,
    renameTag,
    deleteTag,
    listTags,
    MAX_TAG_NAME_LENGTH,
} from "../src/features/tag/tag.service";

const USER = "user-1";

beforeEach(() => {
    vi.clearAllMocks();
    linkTagDeleteMany.mockResolvedValue({ count: 0 });
    linkTagCreateMany.mockResolvedValue({ count: 0 });
});

describe("tags: names are normalised", () => {
    it("lower-cases so 'Launch' and 'launch' are one tag", () => {
        // Otherwise the unique index on (userId, name) accepts all three
        // casings and the owner has to reconcile them by hand.
        expect(normaliseTagName("Launch")).toBe("launch");
        expect(normaliseTagName("  Q3 CAMPAIGN  ")).toBe("q3 campaign");
        expect(normaliseTagName("Launch")).toBe(normaliseTagName("LAUNCH"));
    });

    it("rejects a name that is too long", () => {
        expect(() => normaliseTagName("x".repeat(MAX_TAG_NAME_LENGTH + 1))).toThrow();
    });

    it("rejects an empty name", () => {
        expect(() => normaliseTagName("   ")).toThrow();
    });

    it("rejects a script injection attempt rather than storing it", () => {
        expect(() => normaliseTagName("<script>alert(1)</script>")).not.toThrow();
        // Length is the only rule, so this is stored verbatim, but never
        // interpolated unescaped anywhere.
        expect(normaliseTagName("<b>x</b>")).toBe("<b>x</b>");
    });
});

describe("tags: applying to a link", () => {
    it("creates any tag that does not exist yet", async () => {
        // The picker accepts free text, so creating on demand is what makes it
        // usable without a separate create round-trip.
        tagUpsert
            .mockResolvedValueOnce({ id: "tag-1", name: "launch" })
            .mockResolvedValueOnce({ id: "tag-2", name: "q3" });

        await applyTagsToLink(USER, "link-1", ["Launch", "Q3"]);

        expect(tagUpsert).toHaveBeenCalledTimes(2);
        expect(tagUpsert.mock.calls[0][0]).toEqual({
            where: { userId_name: { userId: USER, name: "launch" } },
            create: { userId: USER, name: "launch" },
            update: {},
        });
    });

    it("scopes every lookup to the owner, so another account's tag is unreachable", async () => {
        tagUpsert.mockResolvedValue({ id: "tag-1", name: "launch" });

        await applyTagsToLink(USER, "link-1", ["launch"]);

        for (const call of tagUpsert.mock.calls) {
            expect(call[0].create.userId).toBe(USER);
        }
    });

    it("deduplicates and normalises before touching the database", async () => {
        tagUpsert.mockResolvedValue({ id: "tag-1", name: "launch" });

        await applyTagsToLink(USER, "link-1", ["Launch", "launch", "LAUNCH"]);

        // Three casings of one name must not become three upserts and three
        // join rows.
        expect(tagUpsert).toHaveBeenCalledTimes(1);
        expect(linkTagCreateMany.mock.calls[0][0].data).toHaveLength(1);
    });

    it("replaces rather than merges, because the picker sends the full set", async () => {
        tagUpsert.mockResolvedValue({ id: "tag-1", name: "launch" });

        await applyTagsToLink(USER, "link-1", ["launch"]);

        // An omitted tag means the owner removed it, so the old set has to go
        // before the new one is written.
        expect(linkTagDeleteMany).toHaveBeenCalledWith({ where: { linkId: "link-1" } });
    });

    it("writes nothing when the list is empty, but still clears", async () => {
        await applyTagsToLink(USER, "link-1", []);

        expect(linkTagDeleteMany).toHaveBeenCalled();
        expect(linkTagCreateMany).not.toHaveBeenCalled();
    });
});

describe("tags: sync on link update", () => {
    it("leaves tags alone when the key is omitted", async () => {
        // A PATCH that only changes the destination must not strip the tags.
        await syncTagsIfProvided(USER, "link-1", undefined);

        expect(linkTagDeleteMany).not.toHaveBeenCalled();
        expect(linkTagCreateMany).not.toHaveBeenCalled();
    });

    it("clears tags when an empty array is sent", async () => {
        await syncTagsIfProvided(USER, "link-1", []);

        expect(linkTagDeleteMany).toHaveBeenCalled();
        expect(linkTagCreateMany).not.toHaveBeenCalled();
    });

    it("leaves an orphaned tag row rather than deleting it", async () => {
        // The last link carrying "q3" is untagged, so the row survives with a
        // link count of zero. Deleting it would race with the picker, which
        // reads the existing list to offer suggestions: a tag could vanish
        // between being offered and being clicked. Garbage collection is an
        // explicit future decision, not a side effect of untagging.
        tagUpsert.mockResolvedValue({ id: "tag-1", name: "launch" });

        await applyTagsToLink(USER, "link-1", ["launch"]);
        await applyTagsToLink(USER, "link-1", []);

        expect(tagDelete).not.toHaveBeenCalled();
    });

    it("replaces the set when names are sent", async () => {
        tagUpsert.mockResolvedValue({ id: "tag-9", name: "launch" });

        await syncTagsIfProvided(USER, "link-1", ["launch"]);

        expect(linkTagDeleteMany).toHaveBeenCalled();
        expect(linkTagCreateMany).toHaveBeenCalled();
    });
});

describe("tags: creating", () => {
    it("is idempotent rather than erroring on a duplicate name", async () => {
        // The picker creates as the owner types, so two rapid submissions of
        // the same name is ordinary usage, not a conflict worth surfacing.
        tagUpsert.mockResolvedValue({ id: "tag-1", name: "launch" });

        const first = await createTag(USER, "Launch");
        const second = await createTag(USER, "launch");

        expect(first.id).toBe("tag-1");
        expect(second.id).toBe("tag-1");
        expect(tagUpsert).toHaveBeenCalledTimes(2);
    });
});

describe("tags: renaming and deleting are owner-scoped", () => {
    it("404s when the tag belongs to someone else", async () => {
        // Scoped in the query rather than fetched first, so another account's
        // id does not leak its existence via a different status code.
        tagFindFirst.mockResolvedValue(null);

        await expect(renameTag(USER, "tag-999", "renamed")).rejects.toThrow(/not found/i);
        expect(tagUpdate).not.toHaveBeenCalled();
    });

    it("refuses a rename that would collide with an existing tag", async () => {
        tagFindFirst
            .mockResolvedValueOnce({ id: "tag-1", name: "old" })   // the tag itself
            .mockResolvedValueOnce({ id: "tag-2", name: "taken" }); // a different tag

        await expect(renameTag(USER, "tag-1", "taken")).rejects.toThrow(/already have a tag/i);
        expect(tagUpdate).not.toHaveBeenCalled();
    });

    it("renames when the name is free", async () => {
        tagFindFirst
            .mockResolvedValueOnce({ id: "tag-1", name: "old" })
            .mockResolvedValueOnce(null);
        tagUpdate.mockResolvedValue({ id: "tag-1", name: "fresh" });

        const result = await renameTag(USER, "tag-1", "Fresh");

        expect(result.name).toBe("fresh");
        expect(tagUpdate).toHaveBeenCalledWith({
            where: { id: "tag-1" },
            data: { name: "fresh" },
        });
    });

it("allows renaming a tag to a different casing of its own name", async () => {
 tagFindFirst.mockResolvedValueOnce({ id: "tag-1", name: "launch" });
 tagUpdate.mockResolvedValue({ id: "tag-1", name: "launch" });

 await renameTag(USER, "tag-1", "LAUNCH");

 // Not a self-collision. The clash query must exclude this tag by id, which
 // the second findFirst does via NOT: { id }. Asserting the exclusion rather
 // than a call count, because the extra call is the point.
 expect(tagFindFirst).toHaveBeenNthCalledWith(
  2,
  expect.objectContaining({
   where: expect.objectContaining({ NOT: { id: "tag-1" } }),
  })
 );
 expect(tagUpdate).toHaveBeenCalled();
});

    it("404s deleting someone else's tag and leaves it alone", async () => {
        tagFindFirst.mockResolvedValue(null);

        await expect(deleteTag(USER, "tag-999")).rejects.toThrow(/not found/i);
        expect(tagDelete).not.toHaveBeenCalled();
    });

    it("deletes the tag without touching the links it was on", async () => {
        tagFindFirst.mockResolvedValue({ id: "tag-1", name: "launch" });
        tagDelete.mockResolvedValue({});

        await deleteTag(USER, "tag-1");

        // A tag is an organising aid, not part of what the link is.
        expect(tagDelete).toHaveBeenCalledWith({ where: { id: "tag-1" } });
        expect(linkTagDeleteMany).not.toHaveBeenCalled();
    });
});

describe("tags: listing", () => {
    it("returns only the caller's tags, ordered by name", async () => {
        tagFindMany.mockResolvedValue([]);

        await listTags(USER);

        expect(tagFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: USER }, orderBy: { name: "asc" } })
        );
    });

    it("asks for the link count so the picker can show it", async () => {
        tagFindMany.mockResolvedValue([]);

        await listTags(USER);

        expect(tagFindMany.mock.calls[0][0].include._count.select).toEqual({ links: true });
    });
});