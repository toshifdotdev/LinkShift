import { z } from "zod";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../config";

/**
 * Tag names.
 *
 * Short and tight on purpose. These appear inside a picker and a filter row, so
 * a 60-character tag makes both unusable, and the real constraint is that it
 * has to be scannable at a glance among others.
 */
export const MAX_TAG_NAME_LENGTH = 30;
export const MIN_TAG_NAME_LENGTH = 1;

const tagNameSchema = z
    .string()
    .trim()
    .min(MIN_TAG_NAME_LENGTH, "Tag name cannot be empty.")
    .max(MAX_TAG_NAME_LENGTH, `Tag names are ${MAX_TAG_NAME_LENGTH} characters or less.`);

/**
 * Tag input from the client.
 *
 * Normalised to lower case before storage so "Launch", "launch" and "LAUNCH"
 * are one tag rather than three that the owner has to reconcile by hand. The
 * uniqueness index on (userId, name) would otherwise accept all three.
 */
export const normaliseTagName = (raw: string): string =>
    tagNameSchema.parse(raw).toLowerCase();

export const createTagSchema = z.object({
    name: tagNameSchema,
});

export const renameTagSchema = z.object({
    name: tagNameSchema,
});

export const applyTagsSchema = z.object({
    /** Tag names to attach. Created on demand, so a picker can accept typing. */
    tagNames: z.array(tagNameSchema).max(25, "Apply at most 25 tags to a link.").default([]),
});

export type CreateTagData = z.infer<typeof createTagSchema>;
export type ApplyTagsData = z.infer<typeof applyTagsSchema>;

/**
 * Attaches tags to a link, creating any that do not exist yet.
 *
 * Names arrive from a free-text picker, so creating on demand is what makes the
 * control usable. Names are scoped to the owner, so this can never attach
 * another account's tag.
 */
export const applyTagsToLink = async (
    userId: string,
    linkId: string,
    names: string[]
): Promise<void> => {
    const wanted = Array.from(
        new Set(names.map(normaliseTagName).filter(Boolean))
    );

    // Replace rather than merge: the picker sends the complete desired set, and
    // an omitted tag means the owner removed it.
    await prisma.linkTag.deleteMany({ where: { linkId } });

    if (wanted.length === 0) return;

    const tags = await Promise.all(
        wanted.map((name) =>
            prisma.tag.upsert({
                where: { userId_name: { userId, name } },
                create: { userId, name },
                update: {},
            })
        )
    );

    await prisma.linkTag.createMany({
        data: tags.map((tag) => ({ linkId, tagId: tag.id })),
        skipDuplicates: true,
    });
};

/** Replaces a link's tags, but only when the caller actually supplied the key. */
export const syncTagsIfProvided = async (
    userId: string,
    linkId: string,
    provided: string[] | undefined
): Promise<void> => {
    if (provided === undefined) return;
    await applyTagsToLink(userId, linkId, provided);
};

export const listTags = async (userId: string) => {
    return prisma.tag.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        include: { _count: { select: { links: true } } },
    });
};

/**
 * Creates a tag, or returns the existing one if the name is already taken.
 *
 * Idempotent rather than a 409: the picker creates on demand as the owner
 * types, so two rapid submissions of the same name is ordinary usage, not a
 * conflict worth surfacing an error for.
 */
export const createTag = async (
    userId: string,
    rawName: string
): Promise<{ id: string; name: string }> => {
    const name = normaliseTagName(rawName);

    const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
    });

    return { id: tag.id, name: tag.name };
};

/**
 * Renames a tag.
 *
 * Scoped by userId in the query rather than looked up first, so another
 * account's tag returns 404 instead of disclosing that the id exists.
 */
export const renameTag = async (
    userId: string,
    tagId: string,
    rawName: string
): Promise<{ id: string; name: string }> => {
    const name = normaliseTagName(rawName);

    const existing = await prisma.tag.findFirst({ where: { id: tagId, userId } });
    if (!existing) {
        throw new AppError("Tag not found", 404);
    }

    const clash = await prisma.tag.findFirst({
        where: { userId, name, NOT: { id: tagId } },
    });
    if (clash) {
        throw new AppError(`You already have a tag called "${name}".`, 409);
    }

    const updated = await prisma.tag.update({ where: { id: tagId }, data: { name } });
    return { id: updated.id, name: updated.name };
};

/**
 * Deletes a tag. The links it was on survive, because a tag is an organising
 * aid and not part of what the link is.
 */
export const deleteTag = async (userId: string, tagId: string): Promise<void> => {
    const existing = await prisma.tag.findFirst({ where: { id: tagId, userId } });
    if (!existing) {
        throw new AppError("Tag not found", 404);
    }

    await prisma.tag.delete({ where: { id: tagId } });
};